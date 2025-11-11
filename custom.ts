/**
 * Utility blocks for sprites
 */
//% weight=99 color="#4B7BEC" icon="\uf0c7"
//% block="Utility"
//% groups='["Sprite", "General"]'
namespace spriteutils {
    export enum NullConsts {
        //% block="undefined"
        Undefined,
        //% block="null"
        Null,
    }

    export enum Consts {
        //% block="undefined" blockHidden=1
        Undefined,
        //% block="null" blockHidden=1
        Null,
        //% block="NaN"
        NaN,
        //% block="π"
        Pi,
        //% block="e"
        E,
        //% block="LN2"
        LN2,
        //% block="LN10"
        LN10,
        //% block="√1/2"
        SQRT1_2,
        //% block="√2"
        SQRT2
    }
    export enum UpdatePriority {
        //% block="updates the controller"
        Controller = scene.CONTROLLER_PRIORITY,
        //% block="updates the controller extension"
        UpdateController = scene.UPDATE_CONTROLLER_PRIORITY,
        //% block="updates following sprites"
        FollowSprite = scene.FOLLOW_SPRITE_PRIORITY,
        //% block="updates controller sprites"
        ControllerSprites = scene.CONTROLLER_SPRITES_PRIORITY,
        //% block="runs physics"
        Physics = scene.PHYSICS_PRIORITY,
        //% block="updates animations"
        Animation = scene.ANIMATION_UPDATE_PRIORITY,
        //% block="runs on game update interval"
        UpdateInterval = scene.UPDATE_INTERVAL_PRIORITY,
        //% block="runs on game update"
        Update = scene.UPDATE_PRIORITY,
        //% block="updates the camera"
        Camera = scene.PRE_RENDER_UPDATE_PRIORITY,
        //% block="renders background image"
        RenderBackground = scene.RENDER_BACKGROUND_PRIORITY,
        //% block="renders all sprites"
        RenderSprites = scene.RENDER_SPRITES_PRIORITY,
        //% block="renders diagnostics"
        RenderDiagnostics = scene.RENDER_DIAGNOSTICS_PRIORITY,
        //% block="updates the screen"
        UpdateScreen = scene.UPDATE_SCREEN_PRIORITY
    }

    export enum UpdatePriorityModifier {
        //% block="before"
        Before,
        //% block="after"
        After
    }

    let stateStack: SpriteUtilState[];

    class SpriteUpdateHandler {
        timer: number;
        constructor(
            public sprite: Sprite,
            public update: (sprite: Sprite) => void,
            public interval: number
        ) {
            this.timer = 0;
        }
    }

    class SpriteKindUpdateHandler {
        timer: number
        constructor(
            public kind: number,
            public update: (sprite: Sprite) => void,
            public interval: number
        ) {
            this.timer = 0;
        }
    }

    class SpriteUtilState {
        updatingKinds: SpriteKindUpdateHandler[];
        updatingSprites: SpriteUpdateHandler[];

        constructor() {
            this.updatingSprites = [];
            this.updatingKinds = [];

            game.currentScene().eventContext.registerFrameHandler(scene.UPDATE_PRIORITY + 1, () => {
                this.updateSprites(game.currentScene().eventContext.deltaTimeMillis);
                this.updateSpriteKinds(game.currentScene().eventContext.deltaTimeMillis);
            });
        }

        protected updateSprites(dtMillis: number) {
            let cleanupDestroyed = false;
            for (const handler of this.updatingSprites) {
                if (handler.sprite.flags & sprites.Flag.Destroyed) {
                    cleanupDestroyed = true;
                    continue;
                }

                if (handler.interval) {
                    handler.timer -= dtMillis;
                    while (handler.timer <= 0) {
                        handler.timer += handler.interval;
                        handler.update(handler.sprite);
                    }
                }
                else {
                    handler.update(handler.sprite);
                }
            }

            if (cleanupDestroyed) {
                this.updatingSprites = this.updatingSprites.filter(handler => !(handler.sprite.flags & sprites.Flag.Destroyed))
            }
        }

        protected updateSpriteKinds(dtMillis: number) {
            for (const handler of this.updatingKinds) {
                if (handler.interval) {
                    handler.timer -= dtMillis;
                    while (handler.timer <= 0) {
                        handler.timer += handler.interval;
                        for (const sprite of sprites.allOfKind(handler.kind)) {
                            handler.update(sprite);
                        }
                    }
                }
                else {
                    for (const sprite of sprites.allOfKind(handler.kind)) {
                        handler.update(sprite);
                    }
                }

            }
        }
    }

    function init() {
        if (stateStack) return;

        stateStack = [new SpriteUtilState()];

        game.addScenePushHandler(() => {
            stateStack.push(new SpriteUtilState());
        });

        game.addScenePopHandler(() => {
            stateStack.pop();
            if (stateStack.length === 0) stateStack.push(new SpriteUtilState());
        });
    }

    function state() {
        init();
        return stateStack[stateStack.length - 1];
    }

    export function onSpriteUpdate(target: Sprite, callback: (sprite: Sprite) => void) {
        state().updatingSprites.push(new SpriteUpdateHandler(target, callback, 0))
    }

    export function onSpriteKindUpdate(kind: number, callback: (sprite: Sprite) => void) {
        state().updatingKinds.push(new SpriteKindUpdateHandler(kind, callback, 0))
    }

    //% blockId=spriteutilonspriteupdateinterval
    //% block="on $target update $sprite every $interval ms"
    //% handlerStatement
    //% draggableParameters=reporter
    //% target.shadow=variables_get
    //% target.defl=mySprite
    //% interval.shadow=timePicker
    //% interval.defl=500
    //% group=Sprite
    //% weight=4
    export function onSpriteUpdateInterval(target: Sprite, interval: number, callback?: (sprite: Sprite) => void) {
        state().updatingSprites.push(new SpriteUpdateHandler(target, callback, Math.max(interval || 0, 0)))
    }

    //% blockId=spriteutilonspritekindupdateinterval
    //% block="on $sprite of kind $kind update every $interval ms"
    //% draggableParameters=reporter
    //% kind.shadow=spritekind
    //% interval.shadow=timePicker
    //% interval.defl=500
    //% group=Sprite
    //% weight=9
    export function onSpriteKindUpdateInterval(kind: number, interval: number, callback: (sprite: Sprite) => void) {
        state().updatingKinds.push(new SpriteKindUpdateHandler(kind, callback, Math.max(interval || 0, 0)))
    }

}