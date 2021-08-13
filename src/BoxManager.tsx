import Emittery from 'emittery';
import { AddAppOptions, emitter, AppInitState, WindowManager } from './index';
import { Events } from './constants';
import { App } from './typings';
import {
    ReadonlyTeleBox,
    TeleBox,
    TeleBoxCollector,
    TeleBoxEventType,
    TeleBoxManager,
    TeleBoxState,
    TeleBoxManagerEventType
} from 'telebox-insider';
import { View, WhiteScene } from 'white-web-sdk';
import debounce from 'lodash.debounce';
import { log } from './log';

export { TeleBoxState };

export type CreateBoxParams = {
    appId: string,
    app: App,
    view?: View,
    emitter?: Emittery,
    options?: AddAppOptions
};

type AppId = { appId: string };

type MoveBoxParams = AppId & { x: number, y: number };

type ResizeBoxParams = AppId & { width: number, height: number };

type SetBoxMinSizeParams = AppId & { minWidth: number, minHeight: number };

type SetBoxTitleParams = AppId & { title: string };
export class BoxManager {
    public teleBoxManager: TeleBoxManager;
    public appBoxMap: Map<string, string> = new Map();

    constructor(
        private mainView: View,
        private manager: WindowManager
    ) {
        this.mainView = mainView;
        this.teleBoxManager = this.setupBoxManager();;
    }

    public createBox(params: CreateBoxParams) {
        const { width, height } = params.app.config ?? {};
        const title = params.options?.title || params.appId;
        const box = this.teleBoxManager.create({
            title: title,
            width: width, height: height,
        });

        emitter.emit(`${params.appId}${Events.WindowCreated}`);
        this.addBoxListeners(params.appId, box);
        this.appBoxMap.set(params.appId, box.id);
        this.teleBoxManager.events.on(TeleBoxManagerEventType.State, state => {
            if (state) {
                emitter.emit(state, undefined);
            }
        });
    }

    public setupBoxManager() {
        const root = WindowManager.root ? WindowManager.root : document.body;
        const rect = root.getBoundingClientRect();
        const manager = new TeleBoxManager({
            root: root,
            containerRect: {
                x: 0, y: 0,
                width: rect.width, height: rect.height
            },
            collector: new TeleBoxCollector().mount(document.body),
            fence: false
        });
        this.teleBoxManager = manager;
        return manager;
    }

    public getBox(appId: string) {
        const boxId = this.appBoxMap.get(appId);
        if (boxId) {
            return this.teleBoxManager.queryOne({ id: boxId });
        }
    }

    public closeBox(appId: string) {
        const boxId = this.appBoxMap.get(appId);
        if (boxId) {
            this.appBoxMap.delete(appId);
            return this.teleBoxManager.remove(boxId);
        }
    }

    public boxIsFocus(appId: string) {
        const box = this.getBox(appId);
        return box?.focus;
    }

    public updateBox(state?: AppInitState) {
        if (!state) return;
        const box = this.getBox(state.id);
        if (box) {
            this.teleBoxManager.update(box.id, {
                x: state.x, y: state.y, width: state.width, height: state.height
            });
            if (state.focus) {
                this.teleBoxManager.update(box.id, { focus: true });
            }
            this.teleBoxManager.setState(state.boxState);
            (box as TeleBox).setSnapshot(state.snapshotRect);
        }
    }

    public updateManagerRect() {
        const rect = this.mainView.divElement?.getBoundingClientRect();
        if (rect) {
            const containerRect = { x: 0, y: 0, width: rect.width, height: rect.height };
            this.teleBoxManager.setContainerRect(containerRect);
            this.manager.appProxies.forEach(proxy => {
                proxy.appEmitter.emit("containerRectUpdate", this.teleBoxManager.containerRect);
            });
        }
    }

    private addBoxListeners(appId: string, box: ReadonlyTeleBox) {
        box.events.on(TeleBoxEventType.Move, debounce(params => emitter.emit("move", { appId, ...params }), 5));
        box.events.on(TeleBoxEventType.Resize, debounce(params => emitter.emit("resize", { appId, ...params }), 5));
        box.events.on(TeleBoxEventType.Focus, () => {
            log("focus", appId);
            emitter.emit("focus", { appId });
        });
        box.events.on(TeleBoxEventType.Blur, () => emitter.emit("blur", { appId }));
        box.events.on(TeleBoxEventType.Snapshot, rect => {
            emitter.emit("snapshot", { appId, rect });
        });
        box.events.on(TeleBoxEventType.Close, () => emitter.emit("close", { appId }));
    }

    public moveBox({ appId, x, y }: MoveBoxParams) {
        const boxId = this.appBoxMap.get(appId);
        if (boxId) {
            this.teleBoxManager.update(boxId, { x, y }, true);
        }
    }

    public focusBox({ appId }: AppId) {
        const boxId = this.appBoxMap.get(appId);
        if (boxId) {
            this.teleBoxManager.update(boxId, { focus: true }, true);
        }
    }

    public resizeBox({ appId, width, height }: ResizeBoxParams) {
        const boxId = this.appBoxMap.get(appId);
        if (boxId) {
            this.teleBoxManager.update(boxId, { width, height }, true);
        }
    }

    public setBoxMinSize(params: SetBoxMinSizeParams) {
        const boxId = this.appBoxMap.get(params.appId);
        if (boxId) {
            this.teleBoxManager.update(boxId, { minWidth: params.minWidth, minHeight: params.minHeight }, true);
        }
    }

    public setBoxTitle(params: SetBoxTitleParams) {
        const boxId = this.appBoxMap.get(params.appId);
        if (boxId) {
            this.teleBoxManager.update(boxId, { title: params.title }, true);
        }
    }

    public blurAllBox() {
        this.teleBoxManager.updateAll({
            focus: false
        });
    }

    public setBoxState(state: TeleBoxState) {
        this.teleBoxManager.setState(state, true);
    }
}
