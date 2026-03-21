import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { LiveFeed } from './screens/LiveFeed';
import { RunDetail } from './screens/RunDetail';
import { HumanReview } from './screens/HumanReview';
import { ReviewQueue } from './screens/ReviewQueue';
import { Analytics } from './screens/Analytics';
import { Settings } from './screens/Settings';
import { SignUp } from './screens/SignUp';
import { SignIn } from './screens/SignIn';
import { EmailVerify } from './screens/EmailVerify';
import { OnboardingWizard } from './screens/OnboardingWizard';

const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: 5000, retry: 1 } },
});

export default function App() {
    return (
        <QueryClientProvider client={qc}>
            <BrowserRouter>
                <Routes>
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/login" element={<SignIn />} />
                    <Route path="/verify" element={<EmailVerify />} />
                    <Route path="/onboarding" element={<OnboardingWizard />} />
                    <Route
                        path="*"
                        element={
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<LiveFeed />} />
                                    <Route path="/run/:id" element={<RunDetail />} />
                                    <Route path="/review" element={<ReviewQueue />} />
                                    <Route path="/review/:id" element={<HumanReview />} />
                                    <Route path="/analytics" element={<Analytics />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Layout>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}
