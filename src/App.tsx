import { AppsSection } from './components/AppsSection'
import { Footer } from './components/Footer'
import { GeneratorCard } from './components/GeneratorCard'
import { Header } from './components/Header'

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1 pt-6 sm:pt-12">
        <GeneratorCard />
        <AppsSection />
      </main>
      <Footer />
    </div>
  )
}
