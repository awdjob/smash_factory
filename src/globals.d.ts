// Smash Factory API
export interface SFApi {
    /**
     * List all processes running on the system.
     * @returns {Promise<Array<{pid: number, name: string}>>} A promise that resolves to an array of process objects.
     */
    listProcesses: () => Promise<Array<{pid: number, name: string}>>;

    /**
     * Scan memory for a value.
     * @param pid - The process ID.
     * @param value - The value to scan for.
     * @returns A promise that resolves to an array of memory scan results.
     */
    scanMemory: (pid: number, value: number) => Promise<Array<{
        address: number,
        hexAddress: string,
        value: number | string,
        unsignedValue?: number | bigint,
        hexValue?: string,
        error?: string
    }>>;

    /**
     * Read memory from a process.
     * @param pid - The process ID.
     * @param address - The address to read from.
     * @param size - The size of the memory to read.
     * @returns A promise that resolves to a buffer containing the memory.
     */
    readMemory: (pid: number, address: number, size: number) => Promise<Buffer>;

    /**
     * Read memory from a process and return it as an array.
     * @param pid - The process ID.
     * @param address - The address to read from.
     * @param size - The size of the memory to read.
     * @returns A promise that resolves to an object containing the memory as a byte array and value information.
     */
    readMemoryAsArray: (pid: number, address: number, size: number) => Promise<{
        byteArray: Uint8Array,
        valueInfo?: {
            address: string,
            rawBytes: string,
            asInt32: number,
            asUint32: number,
            hexUint32: string,
            asInt64?: number,
            asUint64?: bigint,
            hexUint64?: string,
            asFloat?: number,
            asDouble?: number
        }
    }>;

    /**
     * Write memory to a process.
     * @param pid - The process ID.
     * @param address - The address to write to.
     * @param buffer - The buffer to write to the memory.
     * @returns A promise that resolves to a boolean indicating whether the write was successful.
     */
    writeMemory: (pid: number, address: number, buffer: Uint8Array) => Promise<boolean>;
}

declare global {
    interface Window {
        sfAPI: SFApi;
    }
}