import {
    autorun,
    reaction,
    Room,
    SceneDefinition,
    View
} from 'white-web-sdk';
import type { ReadonlyTeleBox } from "@netless/telebox-insider";
import type Emittery from "emittery";
import type { BoxManager } from "./BoxManager";
import type { AppEmitterEvent } from "./index";
import type { AppManager } from "./AppManager";
import type { ViewManager } from "./ViewManager";

export class AppContext<TAttrs extends Record<string, any>> {

    public readonly emitter: Emittery<AppEmitterEvent<TAttrs>>;
    public readonly mobxUtils = {
        autorun, reaction
    };
    private viewManager: ViewManager;
    private boxManager: BoxManager;
    private delegate = this.manager.delegate;
    public readonly isAddApp: boolean;

    constructor(
        private manager: AppManager,
        private appId: string,
        appEmitter: Emittery<AppEmitterEvent<TAttrs>>,
        isAddApp: boolean) {
        this.emitter = appEmitter;
        this.viewManager = this.manager.viewManager;
        this.boxManager = this.manager.boxManager;
        this.isAddApp = isAddApp;
    }

    public getDisplayer() {
        return this.manager.displayer;
    }

    public getAttributes(): TAttrs | undefined {
        return this.manager.windowManger.attributes[this.appId];
    }

    public getScenes(): SceneDefinition[] | undefined {
        const appAttr = this.delegate.getAppAttributes(this.appId);
        if (appAttr?.isDynamicPPT) {
            const appProxy = this.manager.appProxies.get(this.appId);
            if (appProxy) {
                return appProxy.scenes;
            }
        } else {
            return appAttr?.options["scenes"];
        }
    }

    public getView(): View | undefined {
        return this.viewManager.getView(this.appId);;
    }

    public getInitScenePath() {
        return this.manager.getAppInitPath(this.appId);
    }

    public getIsWritable(): boolean {
        return this.manager.canOperate && Boolean(this.boxManager.boxIsFocus(this.appId));
    }

    public getBox(): ReadonlyTeleBox {
        return this.boxManager.getBox(this.appId)!;
    }

    public getRoom(): Room | undefined {
        return this.manager.room;
    }

    public setAttributes(attributes: TAttrs) {
        this.manager.safeSetAttributes({ [this.appId]: attributes });
    }

    public updateAttributes(keys: string[], value: any) {
        if (this.manager.attributes[this.appId]) {
            this.manager.safeUpdateAttributes([this.appId, ...keys], value);
        }
    }

    public mountView(dom: HTMLDivElement): void {
        const view = this.getView();
        if (view) {
            view.divElement = dom;
            setTimeout(() => { // 渲染需要时间，延迟 refresh
                this.getRoom()?.refreshViewSize();
            }, 1000);
        }
    }
}
