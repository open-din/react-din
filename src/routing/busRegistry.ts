const CONTEXT_BUS_REGISTRY = new WeakMap<AudioContext, Map<string, GainNode>>();

function sanitizeBusId(busId: string | undefined): string {
    const trimmed = busId?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : 'default';
}

export function getOrCreateBusNode(context: AudioContext, busId: string | undefined): GainNode {
    const id = sanitizeBusId(busId);
    let byId = CONTEXT_BUS_REGISTRY.get(context);
    if (!byId) {
        byId = new Map<string, GainNode>();
        CONTEXT_BUS_REGISTRY.set(context, byId);
    }

    const existing = byId.get(id);
    if (existing) return existing;

    const bus = context.createGain();
    bus.gain.value = 1;
    byId.set(id, bus);
    return bus;
}
