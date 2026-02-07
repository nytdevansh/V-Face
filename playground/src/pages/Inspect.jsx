import React from 'react';

export default function Inspect({ token }) {
    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-xl">
                <p className="text-gray-500">No token issued yet.</p>
                <p className="text-sm text-gray-600 mt-2">Complete the "Simulate" flow first.</p>
            </div>
        );
    }

    // Decode JWT (without libraries for viz)
    const [header, payload, signature] = token.split('.');
    const decode = (str) => {
        try {
            return JSON.stringify(JSON.parse(atob(str)), null, 2);
        } catch (e) { return "Invalid Base64"; }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Encoded Token</h3>
                    <div className="p-4 bg-black rounded font-mono text-xs text-gray-400 break-all border border-gray-700">
                        <span className="text-red-400">{header}</span>.
                        <span className="text-purple-400">{payload}</span>.
                        <span className="text-blue-400">{signature}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Decoded Payload</h3>
                    <pre className="p-4 bg-black rounded font-mono text-xs text-green-400 overflow-auto">
                        {decode(payload)}
                    </pre>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Verification Status</h3>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-400 font-bold">Valid Signature (check log)</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        In a real scenario, the Resource Server (LLM) verifies this signature against the Registry's public key.
                    </p>
                </div>
            </div>
        </div>
    );
}
