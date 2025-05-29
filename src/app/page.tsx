import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnimatedMainContent from '@/components/AnimatedMainContent';
import PageTransition from '@/components/PageTransition';

export default function Home() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-white text-black">
        <Header />
        <AnimatedMainContent />
        <Footer />
      </div>
    </PageTransition>
  );
}
