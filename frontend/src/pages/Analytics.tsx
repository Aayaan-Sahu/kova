import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ShieldCheck, Timer, XCircle, AlertTriangle, Phone, Users, Bell, HelpCircle, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { UserAnalytics } from '../types/database.types';

export const Analytics = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const { data, error: supabaseError } = await supabase
                    .from('user_analytics')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (supabaseError) {
                    if (supabaseError.code === 'PGRST116') {
                        // No row found - user has no analytics yet
                        setAnalytics(null);
                    } else {
                        throw supabaseError;
                    }
                } else {
                    setAnalytics(data as UserAnalytics);
                    console.log(data);
                }
            } catch (err) {
                console.error('Error fetching analytics:', err);
                setError('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [user]);

    // Transform weekly_stats for chart display
    // Get the last 7 days of activity from daily_stats
    const getDailyChartData = () => {
        const days: { name: string; calls: number; scams: number }[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Generate last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            const dayName = dayNames[date.getDay()];

            const dayData = analytics?.daily_stats?.[dateKey];
            days.push({
                name: dayName,
                calls: dayData?.calls ?? 0,
                scams: dayData?.scams ?? 0,
            });
        }

        return days;
    };

    // Risk distribution data for pie chart
    const getRiskDistributionData = () => {
        if (!analytics) {
            return [];
        }
        return [
            { name: 'High Risk', value: analytics.high_risk_calls, color: '#ef4444' },
            { name: 'Medium Risk', value: analytics.medium_risk_calls, color: '#f59e0b' },
            { name: 'Low Risk', value: analytics.low_risk_calls, color: '#22c55e' },
        ].filter(item => item.value > 0);
    };

    // Format duration in seconds to human readable format
    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    // Format date to relative or readable format
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                    <p className="text-white">{error}</p>
                    <Button onClick={() => navigate('/dashboard')}>Go Back</Button>
                </div>
            </div>
        );
    }

    const activityData = getDailyChartData();
    const riskData = getRiskDistributionData();

    return (
        <div className="min-h-screen bg-neutral-950 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">Analytics</h1>
                </div>

                {!analytics ? (
                    <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-3xl text-center space-y-4">
                        <Phone className="w-12 h-12 text-neutral-600 mx-auto" />
                        <h2 className="text-xl font-semibold text-white">No Analytics Yet</h2>
                        <p className="text-neutral-400">Start making calls with Kova protection to see your analytics here.</p>
                        <Button onClick={() => navigate('/call')}>Start a Call</Button>
                    </div>
                ) : (
                    <>
                        {/* Top Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-2">
                                <div className="flex items-center gap-3 text-brand-400">
                                    <ShieldCheck className="w-5 h-5" />
                                    <h3 className="text-sm font-medium uppercase tracking-wider">Total Calls</h3>
                                </div>
                                <p className="text-4xl font-bold text-white">{analytics.total_calls}</p>
                                <p className="text-xs text-neutral-500">
                                    Duration: {formatDuration(analytics.total_call_duration_seconds)}
                                </p>
                            </div>

                            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-2">
                                <div className="flex items-center gap-3 text-green-400">
                                    <Phone className="w-5 h-5" />
                                    <h3 className="text-sm font-medium uppercase tracking-wider">Safe Calls</h3>
                                </div>
                                <p className="text-4xl font-bold text-white">{analytics.total_safe_calls}</p>
                                <p className="text-xs text-neutral-500">
                                    {analytics.total_calls > 0
                                        ? `${Math.round((analytics.total_safe_calls / analytics.total_calls) * 100)}% safe rate`
                                        : 'No calls yet'}
                                </p>
                            </div>
                        </div>

                        {/* Secondary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">Suspicious</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{analytics.total_suspicious_calls}</p>
                            </div>

                            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-2 text-blue-400 mb-2">
                                    <Bell className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">Alerts Sent</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{analytics.total_alerts_sent}</p>
                            </div>

                            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-2 text-purple-400 mb-2">
                                    <Users className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">Unique Callers</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{analytics.unique_callers_count}</p>
                            </div>

                            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                                    <HelpCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">Questions Asked</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{analytics.total_questions_generated}</p>
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

                            {/* Risk Distribution */}
                            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6">
                                <h2 className="text-lg font-semibold text-white">Risk Distribution</h2>
                                <div className="h-64 w-full">
                                    {riskData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={riskData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {riskData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-neutral-500">
                                            No risk data available
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div>
                                        <p className="text-red-400 font-semibold">{analytics.high_risk_calls}</p>
                                        <p className="text-neutral-500">High Risk</p>
                                    </div>
                                    <div>
                                        <p className="text-yellow-400 font-semibold">{analytics.medium_risk_calls}</p>
                                        <p className="text-neutral-500">Medium Risk</p>
                                    </div>
                                    <div>
                                        <p className="text-green-400 font-semibold">{analytics.low_risk_calls}</p>
                                        <p className="text-neutral-500">Low Risk</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Call Breakdown Bar Chart */}
                        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6">
                            <h2 className="text-lg font-semibold text-white">Weekly Calls vs Blocked</h2>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activityData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                        <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                        />
                                        <Bar dataKey="calls" name="Total Calls" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="scams" name="Scams" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Timeline Info */}
                        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
                            <h2 className="text-lg font-semibold text-white mb-4">Activity Timeline</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div>
                                    <p className="text-neutral-500">First Call</p>
                                    <p className="text-white font-medium">{formatDate(analytics.first_call_at)}</p>
                                </div>
                                <div>
                                    <p className="text-neutral-500">Last Call</p>
                                    <p className="text-white font-medium">{formatDate(analytics.last_call_at)}</p>
                                </div>
                                <div>
                                    <p className="text-neutral-500">Last Scam Detected</p>
                                    <p className="text-white font-medium">{formatDate(analytics.last_scam_detected_at)}</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
