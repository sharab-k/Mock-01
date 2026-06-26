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

export default function LandingPage() {
  return (
    <main>
      <TopBar />
      <Navbar />
      <HeroSection />
      <AboutSection />
      <ProgrammesSection />
      <FeaturesSection />
      <FacultySection />
      <NoticesSection />
      <TestimonialsSection />
      <VisitSection />
      <EnquirySection />
      <Footer />
    </main>
  )
}
