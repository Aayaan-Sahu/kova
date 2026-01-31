import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ShieldCheck, Timer, XCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const Analytics = () => {
    const navigate = useNavigate();

    // Mock data for charts
    const activityData = [
        { name: 'Mon', calls: 4, blocked: 1 },
        { name: 'Tue', calls: 3, blocked: 0 },
        { name: 'Wed', calls: 7, blocked: 2 },
        { name: 'Thu', calls: 5, blocked: 1 },
        { name: 'Fri', calls: 9, blocked: 3 },
        { name: 'Sat', calls: 2, blocked: 0 },
        { name: 'Sun', calls: 1, blocked: 0 },
    ];

    return (
        <div className="min-h-screen bg-neutral-950 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">Analytics</h1>
                </div>

                {/* Top Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-2">
                        <div className="flex items-center gap-3 text-brand-400">
                            <ShieldCheck className="w-5 h-5" />
                            <h3 className="text-sm font-medium uppercase tracking-wider">Calls Screened</h3>
                        </div>
                        <p className="text-4xl font-bold text-white">42</p>
                        <p className="text-xs text-neutral-500">+12% from last week</p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-2">
                        <div className="flex items-center gap-3 text-blue-400">
                            <Timer className="w-5 h-5" />
                            <h3 className="text-sm font-medium uppercase tracking-wider">Protection Uptime</h3>
                        </div>
                        <p className="text-4xl font-bold text-white">98%</p>
                        <p className="text-xs text-neutral-500">Active protection</p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-2">
                        <div className="flex items-center gap-3 text-red-400">
                            <XCircle className="w-5 h-5" />
                            <h3 className="text-sm font-medium uppercase tracking-wider">Scams Blocked</h3>
                        </div>
                        <p className="text-4xl font-bold text-white">7</p>
                        <p className="text-xs text-neutral-500">High risk detected</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Call Volume Chart */}
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6">
                        <h2 className="text-lg font-semibold text-white">Weekly Activity</h2>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activityData}>
                                    <defs>
                                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                    <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="calls" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Call Types Chart */}
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6">
                        <h2 className="text-lg font-semibold text-white">Risk Distribution</h2>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                    <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="calls" name="Safe" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="blocked" name="Risky" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
