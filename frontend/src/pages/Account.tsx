import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Account = () => {
    const navigate = useNavigate();
    const { profile, updateProfile } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        emergencyContact1Name: '',
        emergencyContact1Phone: '',
        emergencyContact2Name: '',
        emergencyContact2Phone: '',
    });

    // Load profile data into form
    useEffect(() => {
        if (profile) {
            const nameParts = (profile.full_name || '').split(' ');
            setFormData({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                phoneNumber: profile.phone_number || '',
                emergencyContact1Name: profile.emergency_contact_one_name || '',
                emergencyContact1Phone: profile.emergency_contact_one_number || '',
                emergencyContact2Name: profile.emergency_contact_two_name || '',
                emergencyContact2Phone: profile.emergency_contact_two_number || '',
            });
        }
    }, [profile]);

    const updateField = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        setSuccess(false); // Clear success message on edit
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setIsLoading(true);

        const fullName = `${formData.firstName} ${formData.lastName}`.trim();

        const { error: updateError } = await updateProfile({
            full_name: fullName,
            phone_number: formData.phoneNumber,
            emergency_contact_one_name: formData.emergencyContact1Name || null,
            emergency_contact_one_number: formData.emergencyContact1Phone || null,
            emergency_contact_two_name: formData.emergencyContact2Name || null,
            emergency_contact_two_number: formData.emergencyContact2Phone || null,
        });

        setIsLoading(false);

        if (updateError) {
            setError(updateError.message);
            return;
        }

        setSuccess(true);
    };

    const hasData = !!profile?.full_name;

    return (
        <div className="min-h-screen bg-neutral-950 p-6 md:p-12">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">Account Settings</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Profile updated successfully!</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                            {hasData && (
                                <span className="text-xs font-medium px-2 py-1 rounded bg-neutral-800 text-neutral-400 uppercase tracking-wider">
                                    ReadOnly Mode
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="First Name"
                                value={formData.firstName}
                                onChange={updateField('firstName')}
                                disabled={hasData}
                            />
                            <Input
                                label="Last Name"
                                value={formData.lastName}
                                onChange={updateField('lastName')}
                                disabled={hasData}
                            />
                            <Input
                                label="Email"
                                defaultValue={profile?.id ? 'Loading...' : ''}
                                disabled
                            />
                            <Input
                                label="Phone Number"
                                value={formData.phoneNumber}
                                onChange={updateField('phoneNumber')}
                                disabled={hasData}
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-neutral-800 space-y-4">
                        <h2 className="text-lg font-semibold text-white">Emergency Contacts</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                                <p className="text-sm font-medium text-brand-400 mb-2">Contact 1</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input
                                        label="Name"
                                        value={formData.emergencyContact1Name}
                                        onChange={updateField('emergencyContact1Name')}
                                        disabled={hasData}
                                    />
                                    <Input
                                        label="Phone"
                                        value={formData.emergencyContact1Phone}
                                        onChange={updateField('emergencyContact1Phone')}
                                        disabled={hasData}
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                                <p className="text-sm font-medium text-brand-400 mb-2">Contact 2</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input
                                        label="Name"
                                        value={formData.emergencyContact2Name}
                                        onChange={updateField('emergencyContact2Name')}
                                        disabled={hasData}
                                    />
                                    <Input
                                        label="Phone"
                                        value={formData.emergencyContact2Phone}
                                        onChange={updateField('emergencyContact2Phone')}
                                        disabled={hasData}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {!hasData && (
                        <div className="pt-6 flex justify-end">
                            <Button type="submit" isLoading={isLoading}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};
