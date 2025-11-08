import { Colony } from "./Colony";

const colonies = new Map<string, Colony>();

export function runColonies(rooms: Room[]): Set<string> {
    const handled = new Set<string>();

    // Remove colonies for rooms no longer owned
    for (const roomName of Array.from(colonies.keys())) {
        if (!rooms.some(room => room.name === roomName)) {
            colonies.delete(roomName);
        }
    }

    for (const room of rooms) {
        const colony = getOrCreateColony(room);
        colony.refresh(room);
        colony.init();
        colony.spawn();
        colony.run(handled);
    }

    return handled;
}

function getOrCreateColony(room: Room): Colony {
    let colony = colonies.get(room.name);
    if (!colony) {
        colony = new Colony(room);
        colonies.set(room.name, colony);
    }
    return colony;
}
