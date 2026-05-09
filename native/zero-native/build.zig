const std = @import("std");

const TraceOption = enum {
    off,
    events,
    runtime,
    all,
};

const app_exe_name = "codex-pets";
const app_bundle_name = "Codex Pets";
const app_version = "0.1.0";
const default_zero_native_path = "node_modules/zero-native";

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const trace_option = b.option(TraceOption, "trace", "Trace output: off, events, runtime, all") orelse .events;
    const debug_overlay = b.option(bool, "debug-overlay", "Enable debug overlay output") orelse false;
    const automation_enabled = b.option(bool, "automation", "Enable zero-native automation artifacts") orelse false;
    const js_bridge_enabled = b.option(bool, "js-bridge", "Enable optional JavaScript bridge stubs") orelse false;
    const zero_native_path = b.option([]const u8, "zero-native-path", "Path to the zero-native package") orelse default_zero_native_path;
    const optimize_name = @tagName(optimize);

    if (target.result.os.tag != .macos) {
        @panic("codex-pets zero-native shell is macOS-only");
    }

    const zero_native_mod = zeroNativeModule(b, target, optimize, zero_native_path);
    const options = b.addOptions();
    options.addOption([]const u8, "platform", "macos");
    options.addOption([]const u8, "trace", @tagName(trace_option));
    options.addOption([]const u8, "web_engine", "system");
    options.addOption(bool, "debug_overlay", debug_overlay);
    options.addOption(bool, "automation", automation_enabled);
    options.addOption(bool, "js_bridge", js_bridge_enabled);
    const options_mod = options.createModule();

    const runner_mod = localModule(b, target, optimize, "src/runner.zig");
    runner_mod.addImport("zero-native", zero_native_mod);
    runner_mod.addImport("build_options", options_mod);

    const app_mod = localModule(b, target, optimize, "src/main.zig");
    app_mod.addImport("zero-native", zero_native_mod);
    app_mod.addImport("runner", runner_mod);

    const exe = b.addExecutable(.{
        .name = app_exe_name,
        .root_module = app_mod,
    });
    linkMacosSystemWebView(b, app_mod, zero_native_path);
    b.installArtifact(exe);

    const frontend_build = b.addSystemCommand(&.{ "npm", "--prefix", "../..", "run", "build" });
    const frontend_copy = b.addSystemCommand(&.{
        "sh",
        "-c",
        "rm -rf dist && mkdir -p dist && cp -R ../../dist/. dist/",
    });
    frontend_copy.step.dependOn(&frontend_build.step);
    const frontend_step = b.step("frontend-build", "Build and stage the root Vite app");
    frontend_step.dependOn(&frontend_copy.step);

    const run = b.addRunArtifact(exe);
    run.step.dependOn(&frontend_copy.step);
    const run_step = b.step("run", "Run the macOS desktop app");
    run_step.dependOn(&run.step);

    const package_output_path = b.fmt("zig-out/package/{s}.app", .{app_bundle_name});
    const package_archive_path = b.fmt("zig-out/package/{s}-macOS.zip", .{app_bundle_name});
    const package = b.addSystemCommand(&.{
        "./node_modules/.bin/zero-native",
        "package",
        "--target",
        "macos",
        "--manifest",
        "app.zon",
        "--assets",
        "dist",
        "--optimize",
        optimize_name,
        "--output",
        package_output_path,
        "--binary",
    });
    package.addFileArg(exe.getEmittedBin());
    package.addArgs(&.{ "--web-engine", "system" });
    package.step.dependOn(&exe.step);
    package.step.dependOn(&frontend_copy.step);
    const package_chmod = b.addSystemCommand(&.{ "chmod", "+x", b.fmt("{s}/Contents/MacOS/{s}", .{ package_output_path, app_exe_name }) });
    package_chmod.step.dependOn(&package.step);
    const package_xattr = b.addSystemCommand(&.{ "/usr/bin/xattr", "-cr", package_output_path });
    package_xattr.step.dependOn(&package_chmod.step);
    const package_codesign = b.addSystemCommand(&.{ "/usr/bin/codesign", "--force", "--deep", "--sign", "-", package_output_path });
    package_codesign.step.dependOn(&package_xattr.step);
    const package_clean_root_xattr = b.addSystemCommand(&.{ "/usr/bin/xattr", "-c", package_output_path });
    package_clean_root_xattr.step.dependOn(&package_codesign.step);
    const package_verify = b.addSystemCommand(&.{ "/usr/bin/codesign", "--verify", "--deep", "--strict", "--verbose=2", package_output_path });
    package_verify.step.dependOn(&package_clean_root_xattr.step);
    const package_final_xattr = b.addSystemCommand(&.{ "/usr/bin/xattr", "-c", package_output_path });
    package_final_xattr.step.dependOn(&package_verify.step);
    const package_zip = b.addSystemCommand(&.{ "/usr/bin/ditto", "-c", "-k", "--keepParent", package_output_path, package_archive_path });
    package_zip.step.dependOn(&package_final_xattr.step);
    const package_step = b.step("package", "Create a local macOS .app bundle");
    package_step.dependOn(&package_zip.step);

    const tests = b.addTest(.{ .root_module = app_mod });
    const test_step = b.step("test", "Run native shell tests");
    test_step.dependOn(&b.addRunArtifact(tests).step);
}

fn localModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, path: []const u8) *std.Build.Module {
    return b.createModule(.{
        .root_source_file = b.path(path),
        .target = target,
        .optimize = optimize,
    });
}

fn zeroNativePath(b: *std.Build, zero_native_path: []const u8, sub_path: []const u8) std.Build.LazyPath {
    return .{ .cwd_relative = b.pathJoin(&.{ zero_native_path, sub_path }) };
}

fn zeroNativeModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, zero_native_path: []const u8) *std.Build.Module {
    const geometry_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/geometry/root.zig");
    const assets_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/assets/root.zig");
    const app_dirs_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/app_dirs/root.zig");
    const trace_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/trace/root.zig");
    const app_manifest_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/app_manifest/root.zig");
    const diagnostics_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/diagnostics/root.zig");
    const platform_info_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/platform_info/root.zig");
    const json_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/json/root.zig");
    const debug_mod = externalModule(b, target, optimize, zero_native_path, "src/debug/root.zig");
    debug_mod.addImport("app_dirs", app_dirs_mod);
    debug_mod.addImport("trace", trace_mod);

    const zero_native_mod = externalModule(b, target, optimize, zero_native_path, "src/root.zig");
    zero_native_mod.addImport("geometry", geometry_mod);
    zero_native_mod.addImport("assets", assets_mod);
    zero_native_mod.addImport("app_dirs", app_dirs_mod);
    zero_native_mod.addImport("trace", trace_mod);
    zero_native_mod.addImport("app_manifest", app_manifest_mod);
    zero_native_mod.addImport("diagnostics", diagnostics_mod);
    zero_native_mod.addImport("platform_info", platform_info_mod);
    zero_native_mod.addImport("json", json_mod);
    return zero_native_mod;
}

fn externalModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, zero_native_path: []const u8, path: []const u8) *std.Build.Module {
    return b.createModule(.{
        .root_source_file = zeroNativePath(b, zero_native_path, path),
        .target = target,
        .optimize = optimize,
    });
}

fn linkMacosSystemWebView(b: *std.Build, app_mod: *std.Build.Module, zero_native_path: []const u8) void {
    app_mod.addCSourceFile(.{ .file = zeroNativePath(b, zero_native_path, "src/platform/macos/appkit_host.m"), .flags = &.{ "-fobjc-arc", "-ObjC" } });
    app_mod.addCSourceFile(.{ .file = b.path("src/macos_notifications.m"), .flags = &.{ "-fobjc-arc", "-ObjC" } });
    app_mod.linkFramework("WebKit", .{});
    app_mod.linkFramework("AppKit", .{});
    app_mod.linkFramework("Foundation", .{});
    app_mod.linkFramework("UserNotifications", .{});
    app_mod.linkFramework("UniformTypeIdentifiers", .{});
    app_mod.linkSystemLibrary("c", .{});
}
