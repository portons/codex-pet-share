const std = @import("std");
const runner = @import("runner");
const zero_native = @import("zero-native");

pub const panic = std.debug.FullPanic(zero_native.debug.capturePanic);

const app_name = "codex-pets";
const display_name = "Codex Pets";
const bundle_id = "dev.porton.codex-pets";
const production_origin = "https://codex-pets.net";

extern fn codex_pets_native_install_menu(api_base: [*]const u8, api_base_len: usize) void;
extern fn codex_pets_native_enable_notifications() void;
extern fn codex_pets_native_notification_status(buffer: [*]u8, buffer_len: usize) usize;

var native_bridge_context: u8 = 0;

const notification_permission = [_][]const u8{"notifications"};
const native_bridge_origins = [_][]const u8{production_origin};
const native_bridge_commands = [_]zero_native.BridgeCommandPolicy{
    .{ .name = "codex-pets.notifications.status", .permissions = &notification_permission, .origins = &native_bridge_origins },
    .{ .name = "codex-pets.notifications.enable", .permissions = &notification_permission, .origins = &native_bridge_origins },
};
const native_bridge_handlers = [_]zero_native.BridgeHandler{
    .{ .name = "codex-pets.notifications.status", .context = &native_bridge_context, .invoke_fn = notificationStatus },
    .{ .name = "codex-pets.notifications.enable", .context = &native_bridge_context, .invoke_fn = enableNotifications },
};

const App = struct {
    fn app(self: *@This()) zero_native.App {
        return .{
            .context = self,
            .name = app_name,
            .source = zero_native.WebViewSource.url(production_origin),
            .start_fn = start,
        };
    }

    fn start(context: *anyopaque, runtime: *zero_native.Runtime) anyerror!void {
        _ = context;
        _ = runtime;
        codex_pets_native_install_menu(production_origin.ptr, production_origin.len);
    }
};

const allowed_origins = [_][]const u8{ "zero://app", "zero://inline", "http://127.0.0.1:5173", production_origin };
const external_urls = [_][]const u8{ "https://github.com/*", "https://x.com/*" };

pub fn main(init: std.process.Init) !void {
    var app = App{};
    try runner.runWithOptions(app.app(), .{
        .app_name = display_name,
        .window_title = display_name,
        .bundle_id = bundle_id,
        .icon_path = "assets/icon.icns",
        .main_window = .{
            .label = "main",
            .title = display_name,
            .default_frame = zero_native.geometry.RectF.init(0, 0, 1280, 860),
            .restore_state = true,
        },
        .security = .{
            .permissions = &.{ "network", "notifications" },
            .navigation = .{
                .allowed_origins = &allowed_origins,
                .external_links = .{
                    .action = .open_system_browser,
                    .allowed_urls = &external_urls,
                },
            },
        },
        .bridge = .{
            .policy = .{
                .enabled = true,
                .commands = &native_bridge_commands,
            },
            .registry = .{ .handlers = &native_bridge_handlers },
        },
    }, init);
}

fn notificationStatus(context: *anyopaque, invocation: zero_native.bridge.Invocation, output: []u8) anyerror![]const u8 {
    _ = context;
    _ = invocation;
    return writeNotificationStatus(output);
}

fn enableNotifications(context: *anyopaque, invocation: zero_native.bridge.Invocation, output: []u8) anyerror![]const u8 {
    _ = context;
    _ = invocation;
    codex_pets_native_enable_notifications();
    return writeNotificationStatus(output);
}

fn writeNotificationStatus(output: []u8) anyerror![]const u8 {
    if (output.len == 0) return error.BufferTooSmall;
    const count = codex_pets_native_notification_status(output.ptr, output.len);
    if (count == 0) return error.NotificationStatusUnavailable;
    return output[0..count];
}

test "production source points at the production app origin" {
    const source = zero_native.WebViewSource.url(production_origin);
    try std.testing.expectEqual(zero_native.WebViewSourceKind.url, source.kind);
    try std.testing.expectEqualStrings(production_origin, source.bytes);
}

test "app metadata is configured" {
    try std.testing.expectEqualStrings("codex-pets", app_name);
    try std.testing.expectEqualStrings("Codex Pets", display_name);
    try std.testing.expectEqualStrings("dev.porton.codex-pets", bundle_id);
}

test "native notification bridge is restricted to production origin" {
    const policy = zero_native.BridgePolicy{
        .enabled = true,
        .permissions = &.{"notifications"},
        .commands = &native_bridge_commands,
    };
    try std.testing.expect(policy.allows("codex-pets.notifications.status", production_origin));
    try std.testing.expect(!policy.allows("codex-pets.notifications.status", "https://example.com"));
}
