import type { NpcSystem } from "../world/toys";
import type { RoomMode } from "./types";

export function broadcastNpcSnapshot(
  roomMode: RoomMode,
  npcSystem: NpcSystem | null,
  opts: { includeEmpty?: boolean } = {}
) {
  if (!npcSystem) return;
  const list = npcSystem.list();
  if (list.length === 0 && !opts.includeEmpty) return;

  const liveById = new Map<string, { y: number; vx: number; vz: number }>();
  npcSystem.forEach((state) => {
    liveById.set(state.id, { y: state.y, vx: state.vx, vz: state.vz });
  });
  roomMode.channel.broadcastNpcState({
    ownerId: roomMode.ownUserId,
    npcs: list.map((npc) => {
      const live = liveById.get(npc.id);
      return {
        id: npc.id,
        petId: npc.petId,
        spritesheetUrl: npc.spritesheetUrl,
        x: npc.x,
        y: live?.y ?? 0,
        z: npc.z,
        vx: live?.vx ?? 0,
        vz: live?.vz ?? 0
      };
    })
  });
}
