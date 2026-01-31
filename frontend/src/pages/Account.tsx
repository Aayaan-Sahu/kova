import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Save } from 'lucide-react';

export const Account = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-950 p-6 md:p-12">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">Account Settings</h1>
                </div>

                <div className="space-y-6 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="First Name" defaultValue="John" />
                            <Input label="Last Name" defaultValue="Doe" />
                            <Input label="Email" defaultValue="john@example.com" disabled />
                            <Input label="Phone Number" defaultValue="+1 (555) 123-4567" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-neutral-800 space-y-4">
                        <h2 className="text-lg font-semibold text-white">Emergency Contacts</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                                <p className="text-sm font-medium text-brand-400 mb-2">Contact 1</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input label="Name" defaultValue="Jane Doe" />
                                    <Input label="Phone" defaultValue="+1 (555) 987-6543" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <Button>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
