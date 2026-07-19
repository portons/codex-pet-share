import type { ComponentProps } from "react";
import { NativeAppPrompts } from "../native/NativeAppPrompts";
import { PlaygroundRouteLayers } from "../playground/PlaygroundRouteLayers";
import { AppFooter } from "./AppChrome";
import { AppDialogs } from "./AppDialogs";
import { AppRoutes } from "./AppRoutes";
import { AppSidebar } from "./AppSidebar";

export type AppViewProps = {
  nav: ComponentProps<typeof AppSidebar>;
  routes: ComponentProps<typeof AppRoutes>;
  dialogs: ComponentProps<typeof AppDialogs>;
  playground: ComponentProps<typeof PlaygroundRouteLayers>;
};

export function AppView({ nav, routes, dialogs, playground }: AppViewProps) {
  return (
    <div className="appFrame">
      <AppSidebar {...nav} />
      <main className="appCanvas">
        <div className="appContent">
          <NativeAppPrompts />
          <AppRoutes {...routes} />
          <AppFooter />
        </div>
      </main>
      <AppDialogs {...dialogs} />
      <PlaygroundRouteLayers {...playground} />
    </div>
  );
}
