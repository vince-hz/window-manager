import { listenUpdated, unlistenUpdated, reaction, UpdateEventKind } from "white-web-sdk";
import type { AkkoObjectUpdatedProperty } from "white-web-sdk";

// 兼容 13 和 14 版本 SDK
export const onObjectByEvent = (event: UpdateEventKind) => {
    return (object: any, func: () => void) => {
        if (object === undefined) return;
        if (listenUpdated && UpdateEventKind) {
            const listener = (events: readonly AkkoObjectUpdatedProperty<any>[]) => {
                const kinds = events.map(e => e.kind);
                if (kinds.includes(event)) {
                    func();
                }
            }
            listenUpdated(object, listener);
            func();
            return () => unlistenUpdated(object, listener);
        } else {
            return reaction(
                () => object,
                () => {
                    func();
                }, {
                    fireImmediately: true,
                }
            )
        }
    }
}

export const onObjectRemoved = onObjectByEvent(UpdateEventKind?.Removed);
export const onObjectInserted = onObjectByEvent(UpdateEventKind?.Inserted);
