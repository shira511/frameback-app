import { useNavigate } from 'react-router-dom';
import { Layout, MessageSquare, Pencil, Clock, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const Home: React.FC = () => {
  const { user, isLoading, error } = useAuth();
  const navigate = useNavigate();
  console.log('Home component - Auth status:', { user: !!user, isLoading, error: error?.message });
  console.log('Environment check:', {
    supabaseConfigured: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  });  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Layout className="mr-2 text-primary-500" size={24} />
            <span className="text-xl font-bold text-primary-500">FrameBack</span>
          </div>
          <div>
            <Button
              onClick={() => navigate('/login')}
              variant="primary"
              size="md"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Collaborative Video Feedback,{" "}
            <span className="text-primary-500">Simplified</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Leave timestamped comments and drawings on videos for faster, clearer feedback. No video hosting needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/login')}
              variant="primary"
              size="lg"
              className="text-lg"
            >
              Get Started
            </Button>
            <Button
              onClick={() => {
                const featuresSection = document.getElementById('features');
                featuresSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              variant="outline"
              size="lg"
              className="text-lg"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section id="features" className="py-20 px-4 bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">
            Designed for Video Teams
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <FeatureCard 
              icon={<Clock size={32} className="text-primary-500" />}
              title="Timestamped Feedback"
              description="Leave comments at specific moments in the video with one-click timeline navigation."
            />
            <FeatureCard 
              icon={<Pencil size={32} className="text-primary-500" />}
              title="Visual Annotations"
              description="Draw directly on video frames to highlight exactly what you're talking about."
            />
            <FeatureCard 
              icon={<MessageSquare size={32} className="text-primary-500" />}
              title="Threaded Discussions"
              description="Reply to comments and use reactions to acknowledge feedback without cluttering the conversation."
            />
            <FeatureCard 
              icon={<Users size={32} className="text-primary-500" />}
              title="Team Collaboration"
              description="See who left feedback with profile pictures and real-time updates."
            />
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to streamline your video feedback process?
          </h2>
          <p className="text-lg text-slate-300 mb-10">
            Sign up today and start collaborating on videos with your team.
          </p>
          <Button
            onClick={() => navigate('/login')}
            variant="primary"
            size="lg"
            className="text-lg"
          >
            Sign Up Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400">
          <div className="flex items-center justify-center mb-4">
            <Layout className="mr-2 text-primary-500" size={20} />
            <span className="text-lg font-semibold text-primary-500">FrameBack</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} FrameBack. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-slate-900 p-6 rounded-lg shadow-lg transition-transform hover:transform hover:-translate-y-1">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-300">{description}</p>
    </div>
  );
};

export default Home;