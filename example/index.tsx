import React from "react";
import ReactDom from "react-dom";
import { PlayerPhase, WhiteWebSdk } from "white-web-sdk";
import { BuiltinApps, WindowManager } from "../dist/index.es";
import type { WindowManager as WindowManagerType } from "../dist";
import { createStatic, createDynamic, createHelloWorld, createVideo, createSlide, createCounter } from "./apps";
import "../dist/style.css";
import "./register";
import "./index.css";

const sdk = new WhiteWebSdk({
    appIdentifier: import.meta.env.VITE_APPID,
    useMobXState: true,
});

const anyWindow = window as any;

(window as any).WindowManager = WindowManager;

let firstPlay = false;

const search = window.location.search;
const url = new URLSearchParams(search);
const isWritable = url.get("isWritable");
const isReplay = url.get("isReplay");

let manager: WindowManagerType;

const mountManager = async (room, root) => {
    manager = (await WindowManager.mount({
        room,
        // collectorStyles: { bottom: "100px", left: "30px" },
        containerSizeRatio: 9 / 16,
        chessboard: true,
        debug: true,
        cursor: true,
    })) as WindowManagerType;

    console.log("pageState", manager.pageState);

    manager.emitter.on("ready", () => {
        console.log("manager ready", manager.queryAll());
    });

    manager.bindContainer(root);
    console.log("manager apps", manager.queryAll());
    console.log("manager mounted boxState:", manager.boxState);
    (window as any).manager = manager;
    (window as any).manager.onAppDestroy(BuiltinApps.DocsViewer, error => {
        console.log("onAppDestroy", error);
    });

    (window as any).manager.emitter.on("mainViewModeChange", mode => {
        console.log("mode", mode);
    });

    manager.emitter.on("boxStateChange", state => {
        console.log("boxStateChange:", state);
    });

    manager.emitter.on("mainViewSceneIndexChange", index => {
        console.log("mainViewSceneIndexChange", index);
    });
    manager.emitter.on("focusedChange", focus => {
        console.log("focusedChange", focus);
    });
    manager.emitter.on("mainViewScenesLengthChange", length => {
        console.log("mainViewScenesLengthChange", length);
    });
    manager.emitter.on("canRedoStepsChange", steps => {
        console.log("canRedoStepsChange", steps);
    });
    manager.emitter.on("canUndoStepsChange", steps => {
        console.log("canUndoStepsChange", steps);
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    manager.emitter.on("cameraStateChange", state => {
        // console.log("cameraStateChange", state);
    });

    manager.emitter.on("sceneStateChange", state => {
        console.log("sceneStateChange", state);
    });

    manager.emitter.on("loadApp", payload => {
        console.log("loadApp", payload);
    });

    manager.emitter.on("pageStateChange", state => {
        console.log("pageStateChange", state);
    });
};

const replay = () => {
    sdk.replayRoom({
        room: import.meta.env.VITE_ROOM_UUID,
        roomToken: import.meta.env.VITE_ROOM_TOKEN,
        invisiblePlugins: [WindowManager as any],
        useMultiViews: true,
    }).then(async player => {
        await manager?.destroy();
        anyWindow.room?.disconnect();
        setTimeout(async () => {
            anyWindow.player = player;
            // player.bindHtmlElement(document.getElementById("container") as any)
            player.play();
        }, 500);
        player.callbacks.on("onPhaseChanged", phase => {
            if (phase === PlayerPhase.Playing) {
                if (firstPlay) return;
                setTimeout(() => {
                    mountManager(player, document.getElementById("container"));
                }, 1000);
                firstPlay = true;
            }
        });
    });
};

const onRef = ref => {
    const uid = Math.random().toString().substr(3, 8);
    if (isReplay) {
        replay();
    } else {
        sdk.joinRoom({
            uuid: import.meta.env.VITE_ROOM_UUID,
            roomToken: import.meta.env.VITE_ROOM_TOKEN,
            invisiblePlugins: [WindowManager as any],
            useMultiViews: true,
            userPayload: {
                userId: "111",
                cursorName: uid,
                avatar: "https://avatars.githubusercontent.com/u/8299540?s=60&v=4",
            },
            isWritable: !(isWritable === "false"),
            cursorAdapter: undefined,
            uid: uid,
            disableMagixEventDispatchLimit: true,
            disableNewPencil: false,
            floatBar: true,
        }).then(async room => {
            if (room.isWritable) {
                // room.setMemberState({ strokeColor: [0, 0, 1] });
            }
            (window as any).room = room;
            await mountManager(room, ref);
        });
    }
    
};

const destroy = () => {
    manager.destroy();
    manager = undefined;
};

anyWindow.mountManager = mountManager;
anyWindow.destroy = destroy;

const prevPage = (manager: WindowManager) => {
    manager.prevPage();
};

const nextPage = (manager: WindowManager) => {
    manager.nextPage();
};

const App = () => {
    return (
        <div className="app">
            <div
                ref={onRef}
                id="container"
                style={{
                    flex: 1,
                    height: "calc(100vh - 32px)",
                    border: "1px solid",
                }}
            ></div>
            <div className="side">
                <button className="side-button" onClick={() => createHelloWorld(manager)}>
                    Hello World
                </button>
                <button className="side-button" onClick={() => createCounter(manager)}>
                    Counter
                </button>
                <button className="side-button" onClick={() => createStatic(manager)}>
                    课件 static
                </button>
                <button className="side-button" onClick={() => createDynamic(manager)}>
                    课件 dynamic
                </button>
                <button className="side-button" onClick={() => createSlide(manager)}>
                    Slide
                </button>
                <button className="side-button" onClick={() => createVideo(manager)}>
                    视频
                </button>
                <button className="side-button" onClick={replay}>
                    回放
                </button>
                <button className="side-button" onClick={() => prevPage(manager)}>
                    上一页
                </button>
                <button className="side-button" onClick={() => nextPage(manager)}>
                    下一页
                </button>
            </div>
        </div>
    );
};

ReactDom.render(<App />, document.getElementById("root"));
