import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const ItemTable = () => {
    const { itemsEnabled, setItemsEnabled, pj64Pid } = useAppContext();
    const [xValue, setXValue] = useState(0);
    
    // Sample item data
    const [items, setItems] = useState([
        { id: 0, name: 'Box', icon: '📦', x: 0, y: 0, z: 0 },
        { id: 1, name: 'Barrel', icon: '🛢️', x: 0, y: 0, z: 0 },
        { id: 2, name: 'Capsule', icon: '💊', x: 0, y: 0, z: 0 },
        { id: 3, name: 'Egg', icon: '🥚', x: 0, y: 0, z: 0 },
        { id: 4, name: 'Maxim Tomato', icon: '🍅', x: 0, y: 0, z: 0 },
        { id: 5, name: 'Heart Container', icon: '❤️', x: 0, y: 0, z: 0 },
        { id: 6, name: 'Star Man', icon: '⭐', x: 0, y: 0, z: 0 },
        { id: 7, name: 'Beam Sword', icon: '⚔️', x: 0, y: 0, z: 0 },
    ]);

    const spawnItem = async (item) => {
        if (!pj64Pid || !itemsEnabled) {
            console.error("Project64 is not running or items not enabled");
            return;
        }
        
        try {
            const baseAddress = parseInt("0xE02E6B64", 16); // Ensure base address is parsed as hex
            
            // Function to create a buffer containing an float32 value
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
            await window.sfAPI.writeMemory(pj64Pid, baseAddress, createInt32Buffer(item.id));
            
            // Write X coordinate to baseAddress + 4
            await window.sfAPI.writeMemory(pj64Pid, baseAddress + 4, createFloat32Buffer(parseFloat(xValue)));
            
            // Write Y coordinate to baseAddress + 8
            await window.sfAPI.writeMemory(pj64Pid, baseAddress + 8, createFloat32Buffer(4000.0));
            
            console.log(`Spawned ${item.name} (ID: ${item.id}) at coordinates X:${xValue}, Y:${item.y}, Z:${item.z}`);
        } catch (error) {
            console.error("Error spawning item:", error);
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-blue-500">
            <div className="flex items-center mb-4">
                <input 
                    type="checkbox" 
                    className="w-4 h-4 mr-2"
                    checked={itemsEnabled}
                    onChange={() => setItemsEnabled(!itemsEnabled)}
                    id="enabled"
                />
                <label htmlFor="enabled" className="text-yellow-300 font-bold text-xl">
                    Items Enabled
                </label>
            </div>

            {/* X Value Slider */}
            <div className="mb-6">
                <div className="flex justify-between mb-2">
                    <label htmlFor="xSlider" className="text-yellow-300 font-bold">
                        X Position: {xValue}
                    </label>
                </div>
                <input
                    type="range"
                    id="xSlider"
                    min="-4000"
                    max="4000"
                    step="5"
                    value={xValue}
                    onChange={(e) => setXValue(Number(e.target.value))}
                    disabled={!itemsEnabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                />
                <div className="flex justify-between">
                    <span className="text-gray-400">-4000</span>
                    <span className="text-gray-400">0</span>
                    <span className="text-gray-400">4000</span>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
                {items.map(item => (
                    <div 
                        key={item.id} 
                        className="flex flex-col items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                        onClick={() => itemsEnabled && spawnItem(item)}
                    >
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <div className="text-white text-center font-medium">{item.name}</div>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-gray-400 text-sm">
                <p>Adjust the X value with the slider and click on an item to spawn it.</p>
            </div>
        </div>
    );
};

export default ItemTable;
