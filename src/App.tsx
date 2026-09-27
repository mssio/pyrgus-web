import { AppsDialog } from './components/AppsDialog'
import { Footer } from './components/Footer'
import { GeneratorCard } from './components/GeneratorCard'
import { Header } from './components/Header'

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col justify-center py-8">
        <GeneratorCard />
        <AppsDialog />
      </main>
      <Footer />
    </div>
  )
}
