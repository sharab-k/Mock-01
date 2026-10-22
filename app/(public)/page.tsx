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
import { fetchPublicNotices } from '@/lib/notices/public'

// Rendered once and served from the CDN (rebuilt every 5 minutes, or at once when
// a notice changes) instead of on every visit.
export const revalidate = 300

export default async function LandingPage() {
  const notices = await fetchPublicNotices()

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
