import TopBar from './components/TopBar'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import ProgrammesSection from './components/ProgrammesSection'
import FeaturesSection from './components/FeaturesSection'
import FacultySection from './components/FacultySection'
import NoticesSection from './components/NoticesSection'
import TestimonialsSection from './components/TestimonialsSection'
import VisitSection from './components/VisitSection'
import EnquirySection from './components/EnquirySection'
import Footer from './components/Footer'
import { LandingPageProvider } from './LandingPageContext'
import { fetchVisibleNotices } from '@/lib/notices/fetch'

export default async function LandingPage() {
  const notices = await fetchVisibleNotices()

  return (
    <LandingPageProvider>
      <main>
        <TopBar />
        <Navbar />
        <HeroSection />
        <AboutSection />
        <ProgrammesSection />
        <FeaturesSection />
        <FacultySection />
        <NoticesSection notices={notices} />
        <TestimonialsSection />
        <VisitSection />
        <EnquirySection />
        <Footer />
      </main>
    </LandingPageProvider>
  )
}
