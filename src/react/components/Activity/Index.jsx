import React, { useState } from 'react';

const Activity = () => {
  // Sample activity data
  const [activities, setActivities] = useState([
    { id: 1, timestamp: '2023-04-27 15:32:45', itemName: 'Bob-omb', icon: '💣', coordinates: { x: 120, y: 450, z: 0 }, status: 'success' },
    { id: 2, timestamp: '2023-04-27 15:30:21', itemName: 'Star', icon: '⭐', coordinates: { x: 300, y: 200, z: 0 }, status: 'success' },
    { id: 3, timestamp: '2023-04-27 15:28:12', itemName: 'Heart Container', icon: '❤️', coordinates: { x: 400, y: 250, z: 0 }, status: 'success' },
    { id: 4, timestamp: '2023-04-27 15:25:33', itemName: 'Ray Gun', icon: '🔫', coordinates: { x: 150, y: 320, z: 0 }, status: 'success' },
    { id: 5, timestamp: '2023-04-27 15:22:17', itemName: 'Beam Sword', icon: '⚔️', coordinates: { x: 280, y: 380, z: 0 }, status: 'failed' },
    { id: 6, timestamp: '2023-04-27 15:20:05', itemName: 'Motion Sensor Bomb', icon: '💥', coordinates: { x: 220, y: 190, z: 0 }, status: 'success' },
    { id: 7, timestamp: '2023-04-27 15:18:52', itemName: 'Maxim Tomato', icon: '🍅', coordinates: { x: 350, y: 270, z: 0 }, status: 'success' },
    { id: 8, timestamp: '2023-04-27 15:15:11', itemName: 'Home Run Bat', icon: '🏏', coordinates: { x: 180, y: 300, z: 0 }, status: 'failed' },
  ]);

  // Function to clear activity log
  const clearActivityLog = () => {
    setActivities([]);
  };

  // Function to get class based on status
  const getStatusClass = (status) => {
    return status === 'success' ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-blue-500 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-yellow-300 font-bold text-xl">Recent Activity</h2>
        <button 
          onClick={clearActivityLog}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          Clear Log
        </button>
      </div>

      <div className="overflow-auto max-h-96">
        {activities.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-gray-700 text-yellow-300">
              <tr>
                <th className="p-2 rounded-tl-lg">&nbsp;</th>
                <th className="p-2">Time</th>
                <th className="p-2">Item</th>
                <th className="p-2">Coordinates</th>
                <th className="p-2 rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-700 transition-colors">
                  <td className="p-2 text-2xl">{activity.icon}</td>
                  <td className="p-2 text-gray-300 text-sm">
                    {activity.timestamp}
                  </td>
                  <td className="p-2 text-white font-medium">
                    {activity.itemName}
                  </td>
                  <td className="p-2 text-gray-300">
                    ({activity.coordinates.x}, {activity.coordinates.y}, {activity.coordinates.z})
                  </td>
                  <td className={`p-2 font-medium ${getStatusClass(activity.status)}`}>
                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No activity to display</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-gray-400 text-sm">
        <p>Shows history of item spawns and their status.</p>
      </div>
    </div>
  );
};

export default Activity;
