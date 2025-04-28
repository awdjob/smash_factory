import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

const Item = ({ itemProps }) => {
    const { itemsEnabled, pj64Pid } = useAppContext();
    const [item, setItem] = useState({ ...itemProps });

    const handleCoordinateChange = (id, coordinate, value) => {
        setItem(prevItem => ({
            ...prevItem,
            [coordinate]: parseInt(value, 10)
        }));
    };

    const spawnItem = async () => {
        // Base item id address: 0xE02E6B64
        if (!pj64Pid) {
            console.error("Project64 is not running");
            return;
        }
        
        try {
            const baseAddress = parseInt("0xE02E6B64", 16); // Ensure base address is parsed as hex
            
            // Function to create a buffer containing an int32 value
            const createFloat32Buffer = (value) => {
                const buffer = new ArrayBuffer(4);
                const dataView = new DataView(buffer);
                dataView.setFloat32(0, value, true); // true for little-endian
                return new Uint8Array(buffer);
            };

            const createInt32Buffer = (value) => {
                const buffer = new ArrayBuffer(4);
                const dataView = new DataView(buffer);
                dataView.setInt32(0, value, true); // true for little-endian
                return new Uint8Array(buffer);
            };
            
            // Write item ID to baseAddress
            await window.sfAPI.writeMemory(pj64Pid, baseAddress, createInt32Buffer(parseInt(item.id, 16)));
            
            // Write X coordinate to baseAddress + 4
            await window.sfAPI.writeMemory(pj64Pid, baseAddress + 4, createFloat32Buffer(parseFloat(item.x)));
            
            // Write Y coordinate to baseAddress + 8
            await window.sfAPI.writeMemory(pj64Pid, baseAddress + 8, createFloat32Buffer(parseFloat(item.y)));
            
            // Write Z coordinate to baseAddress + 12
            await window.sfAPI.writeMemory(pj64Pid, baseAddress + 12, createFloat32Buffer(parseFloat(item.z)));
            
            console.log(`Spawned ${item.name} (ID: ${item.id}) at coordinates X:${item.x}, Y:${item.y}, Z:${item.z}`);
            console.log(`Memory writes (hex): 
                ID: 0x${item.id.toString(16).padStart(8, '0')} at 0x${baseAddress.toString(16).toUpperCase()}
                X: 0x${item.x.toString(16).padStart(8, '0')} at 0x${(baseAddress + 4).toString(16).toUpperCase()}
                Y: 0x${item.y.toString(16).padStart(8, '0')} at 0x${(baseAddress + 8).toString(16).toUpperCase()}
                Z: 0x${item.z.toString(16).padStart(8, '0')} at 0x${(baseAddress + 12).toString(16).toUpperCase()}
            `);
            
        } catch (error) {
            console.error("Error spawning item:", error);
        }
    };

    return (
        <tr key={item.id} className="hover:bg-gray-700 transition-colors">
            <td className="p-2 text-2xl">{item.icon}</td>
            <td className="p-2 text-white font-medium">{item.name}</td>
            <td className="p-2">
                <input
                    type="number"
                    value={item.x}
                    onChange={(e) => handleCoordinateChange(item.id, 'x', e.target.value)}
                    className="bg-gray-900 text-white rounded px-2 py-1 w-16 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    disabled={!itemsEnabled}
                />
            </td>
            <td className="p-2">
                <input
                    type="number"
                    value={item.y}
                    onChange={(e) => handleCoordinateChange(item.id, 'y', e.target.value)}
                    className="bg-gray-900 text-white rounded px-2 py-1 w-16 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    disabled={!itemsEnabled}
                />
            </td>
            <td className="p-2">
                <input
                    type="number"
                    value={item.z}
                    onChange={(e) => handleCoordinateChange(item.id, 'z', e.target.value)}
                    className="bg-gray-900 text-white rounded px-2 py-1 w-16 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    disabled={!itemsEnabled}
                />
            </td>
            <td className="p-2">
                <button
                    onClick={spawnItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors font-medium"
                    disabled={!itemsEnabled}
                >
                    Spawn
                </button>
            </td>
        </tr>
    );
};

export default Item;
