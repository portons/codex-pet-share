import type { ComponentProps } from "react";
import { NativeAppPrompts } from "../native/NativeAppPrompts";
import { PlaygroundRouteLayers } from "../playground/PlaygroundRouteLayers";
import { AppFooter, AppNav } from "./AppChrome";
import { AppDialogs } from "./AppDialogs";
import { AppRoutes } from "./AppRoutes";

export type AppViewProps = {
  nav: ComponentProps<typeof AppNav>;
  routes: ComponentProps<typeof AppRoutes>;
  dialogs: ComponentProps<typeof AppDialogs>;
  playground: ComponentProps<typeof PlaygroundRouteLayers>;
};

export function AppView({ nav, routes, dialogs, playground }: AppViewProps) {
  return (
    <main className="appShell">
      <AppNav {...nav} />
      <NativeAppPrompts />
      <AppRoutes {...routes} />
      <AppFooter />
      <AppDialogs {...dialogs} />
      <PlaygroundRouteLayers {...playground} />
    </main>
  );
}
