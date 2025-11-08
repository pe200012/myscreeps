import _ from "lodash";

export class ErrorMapper {
    // Cache consumer
    private static _consumer?: any;

    public static get consumer(): any {
        if (this._consumer == null) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const map = require("main.js.map");
                this._consumer = map;
            } catch (e) {
                console.log("Warning: Could not load source map");
            }
        }

        return this._consumer;
    }

    // Transform an error stack trace using source maps
    public static sourceMappedStackTrace(error: Error | string): string {
        const stack: string = error instanceof Error ? (error.stack as string) : error;
        if (this.consumer == null) {
            return stack;
        }

        // For Screeps, we'll use a simplified error mapper
        // Full source map support can be added if needed
        return stack;
    }

    public static wrapLoop(loop: () => void): () => void {
        return () => {
            try {
                loop();
            } catch (e) {
                if (e instanceof Error) {
                    if ("sim" in Game.rooms) {
                        const message = `Source maps don't work in the simulator - displaying original error`;
                        console.log(`<span style='color:red'>${message}<br>${_.escape(e.stack)}</span>`);
                    } else {
                        console.log(`<span style='color:red'>${_.escape(this.sourceMappedStackTrace(e))}</span>`);
                    }
                } else {
                    // can't handle it
                    throw e;
                }
            }
        };
    }
}
