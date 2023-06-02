import { stringToBytes } from "https://deno.land/x/binaryify@0.0.11/tools.js"

const uint8ArrayForHelloWorldWasm = stringToBytes("\0asm\0\0\0\0`\0\0\0p\0\0\0\0\0A\0A\0\0A\0add\0\0\0memor\0y\0	\0\0A\0\n\n\0\0 \0 j\0\0\0\0\0\0\0")

export const wasmBrowserInstantiate = async (importObject) => {
    let response = undefined

    if (!importObject) {
        importObject = {
            env: {
                abort: () => console.log("Abort!"),
            },
        }
    }

    // Check if the browser supports streaming instantiation
    if (WebAssembly.instantiateStreaming) {
        // Fetch the module, and instantiate it as it is downloading
        response = await WebAssembly.instantiateStreaming(uint8ArrayForHelloWorldWasm, importObject)
    } else {
        // Fallback to using fetch to download the entire module
        // And then instantiate the module
        const fetchAndInstantiateTask = async () => {
            return WebAssembly.instantiate(uint8ArrayForHelloWorldWasm, importObject)
        }
        response = await fetchAndInstantiateTask()
    }

    return response
}
