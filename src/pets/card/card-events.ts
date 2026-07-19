import { type MouseEvent } from "react";
import { trackEvent } from "../../domain/analytics";
import type { Pet, User } from "../../domain/types";

export const stopCardPropagation = (event: MouseEvent<HTMLElement>) => event.stopPropagation();

export function trackCardAction(pet: Pet, user: User | null, event: string, value?: string) {
  trackEvent(event, { route: "gallery_card", petId: pet.id, value, user });
}
