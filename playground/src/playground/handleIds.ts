import type { InputParam } from './store';

export const INPUT_PARAM_HANDLE_PREFIX = 'param:';

export function getInputParamHandleId(param: Pick<InputParam, 'id'> | string): string {
    const id = typeof param === 'string' ? param : param.id;
    return `${INPUT_PARAM_HANDLE_PREFIX}${id}`;
}

export function resolveInputParamByHandle(
    params: InputParam[] | undefined,
    handle: string | null | undefined
): { param: InputParam; index: number } | null {
    if (!params?.length || !handle) return null;

    if (handle.startsWith(INPUT_PARAM_HANDLE_PREFIX)) {
        const id = handle.slice(INPUT_PARAM_HANDLE_PREFIX.length);
        const index = params.findIndex((param) => param.id === id);
        if (index >= 0) {
            return { param: params[index], index };
        }
    }

    const legacyMatch = /^param_(\d+)$/.exec(handle);
    if (legacyMatch) {
        const index = Number(legacyMatch[1]);
        const param = params[index];
        if (param) {
            return { param, index };
        }
    }

    return null;
}

export function migrateLegacyInputHandle(
    params: InputParam[] | undefined,
    handle: string | null | undefined
): string | null | undefined {
    const resolved = resolveInputParamByHandle(params, handle);
    return resolved ? getInputParamHandleId(resolved.param) : handle;
}
