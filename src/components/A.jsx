import React from "react"



function A({ onAdd }) {
    return (
        <div id="webcrumbs">
            <div className="min-h-screen bg-gray-900 text-gray-300 flex flex-col">
                {/* Header */}
                <header className="border-b border-gray-800 bg-gray-950 py-4 px-6">
                    <div className="container mx-auto flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-white">code</span>
                            </div>
                            <span className="text-xl font-bold text-white">Component Crafter</span>
                        </div>
                        <nav className="hidden md:flex items-center space-x-8">
                            <a href="/" className="text-gray-300 hover:text-white transition duration-200">
                                Home
                            </a>
                            <a href="/" className="text-gray-300 hover:text-white transition duration-200">
                                Features
                            </a>
                            <a href="/docs" className="text-gray-300 hover:text-white transition duration-200">
                                Docs
                            </a>
                            <a
                                href="https://github.com"
                                className="text-gray-300 hover:text-white transition duration-200 flex items-center"
                            >
                                <i className="fa-brands fa-github mr-2"></i> GitHub
                            </a>
                        </nav>
                        <div className="flex items-center space-x-4">
                            <button className="px-4 py-2 text-gray-300 hover:text-white transition duration-200">
                                Login
                            </button>
                            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white transition duration-200">
                                Sign Up
                            </button>
                            <button className="md:hidden bg-gray-800 p-2 rounded-full">
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="py-16 md:py-24 px-6">
                    <div className="container mx-auto text-center max-w-4xl">
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                            Craft React Components with AI
                        </h1>
                        <p className="text-xl text-gray-400 mb-10">
                            Design, generate, and export beautiful React components using natural language — all powered
                            by AI.
                        </p>
                        <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-lg font-medium transition duration-200 transform hover:scale-105">
                            Start Creating
                        </button>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-16 bg-gray-950 px-6">
                    <div className="container mx-auto">
                        <h2 className="text-3xl font-bold text-white text-center mb-16">
                            Powerful Features for Developers
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="bg-gray-800 p-6 rounded-xl hover:bg-gray-750 transition duration-300 transform hover:-translate-y-1">
                                <div className="bg-indigo-600/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-indigo-400 text-2xl">chat</span>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    AI Chat for Component Generation
                                </h3>
                                <p className="text-gray-400">
                                    Describe your components in natural language and watch them come to life instantly.
                                </p>
                                {/* Next: "Add hover details for this feature" */}
                            </div>
                            <div className="bg-gray-800 p-6 rounded-xl hover:bg-gray-750 transition duration-300 transform hover:-translate-y-1">
                                <div className="bg-indigo-600/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-indigo-400 text-2xl">preview</span>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">Micro-frontend Live Preview</h3>
                                <p className="text-gray-400">
                                    See your components render in real-time as you refine them with AI guidance.
                                </p>
                                {/* Next: "Add hover details for this feature" */}
                            </div>
                            <div className="bg-gray-800 p-6 rounded-xl hover:bg-gray-750 transition duration-300 transform hover:-translate-y-1">
                                <div className="bg-indigo-600/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-indigo-400 text-2xl">
                                        drag_indicator
                                    </span>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    Layout Builder with Drag & Drop
                                </h3>
                                <p className="text-gray-400">
                                    Visually compose complete layouts by arranging your components on a flexible grid.
                                </p>
                                {/* Next: "Add hover details for this feature" */}
                            </div>
                            <div className="bg-gray-800 p-6 rounded-xl hover:bg-gray-750 transition duration-300 transform hover:-translate-y-1">
                                <div className="bg-indigo-600/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-indigo-400 text-2xl">code</span>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">Code Export & Auto-Save</h3>
                                <p className="text-gray-400">
                                    Export clean, production-ready code while your work is automatically saved.
                                </p>
                                {/* Next: "Add hover details for this feature" */}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Demo Section */}
                <section className="py-16 px-6">
                    <div className="container mx-auto">
                        <h2 className="text-3xl font-bold text-white text-center mb-12">See it in Action</h2>
                        <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-800">
                            <div className="h-[500px] bg-gray-800 relative">
                                <img
                                    title="a group of colorful objects"
                                    src="https://images.unsplash.com/photo-1655890954724-b11c86a46ee8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MzkyNDZ8MHwxfHNlYXJjaHwzfHxyZWFjdCUyMGNvbXBvbmVudHN8ZW58MHx8fHwxNzUzMzU2MTEyfDA&ixlib=rb-4.1.0&q=80&w=1080"
                                    alt="Component Crafter Demo"
                                    className="object-cover w-full h-full opacity-80"
                                    keywords="React components, AI generation, code preview, UI development"
                                />
                                <div className="absolute bottom-0 w-full bg-gradient-to-t from-gray-900 to-transparent p-6">
                                    <div className="flex space-x-4 justify-center">
                                        <button className="w-3 h-3 rounded-full bg-white opacity-50 hover:opacity-100 transition-opacity"></button>
                                        <button className="w-3 h-3 rounded-full bg-white opacity-100"></button>
                                        <button className="w-3 h-3 rounded-full bg-white opacity-50 hover:opacity-100 transition-opacity"></button>
                                        <button className="w-3 h-3 rounded-full bg-white opacity-50 hover:opacity-100 transition-opacity"></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Dashboard Preview */}
                <section className="py-16 bg-gray-950 px-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-6">Powerful Developer Dashboard</h2>
                                <p className="text-gray-400 mb-8">
                                    Our intuitive dashboard puts everything you need at your fingertips. Generate,
                                    preview, and refine components all in one place.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-start">
                                        <span className="material-symbols-outlined text-indigo-400 mr-3 mt-1">
                                            check_circle
                                        </span>
                                        <span className="text-gray-300">
                                            Real-time component preview with hot reloading
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="material-symbols-outlined text-indigo-400 mr-3 mt-1">
                                            check_circle
                                        </span>
                                        <span className="text-gray-300">
                                            Interactive AI chat with context-aware suggestions
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="material-symbols-outlined text-indigo-400 mr-3 mt-1">
                                            check_circle
                                        </span>
                                        <span className="text-gray-300">
                                            Syntax-highlighted code editor with auto-formatting
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="material-symbols-outlined text-indigo-400 mr-3 mt-1">
                                            check_circle
                                        </span>
                                        <span className="text-gray-300">
                                            Session history and auto-saving to continue your work
                                        </span>
                                    </li>
                                </ul>
                                <button className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white transition duration-200">
                                    Explore Dashboard
                                </button>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
                                <img
                                    src="https://placehold.co/800x600/1f2937/fff?text=Dashboard+Interface"
                                    alt="Component Crafter Dashboard"
                                    className="w-full"
                                    keywords="developer dashboard, React components, code editor, AI interface"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 px-6 bg-gradient-to-br from-indigo-900/40 to-gray-900">
                    <div className="container mx-auto text-center max-w-3xl">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                            Ready to Transform Your Development Workflow?
                        </h2>
                        <p className="text-xl text-gray-300 mb-10">
                            Join thousands of developers using Component Crafter to build better UIs faster.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-medium transition duration-200 transform hover:scale-105">
                                Sign Up for Free
                            </button>
                            <button className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-md text-white font-medium transition duration-200">
                                View Documentation
                            </button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-950 border-t border-gray-800 py-12 px-6 mt-auto">
                    <div className="container mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div>
                                <div className="flex items-center space-x-2 mb-6">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-sm">code</span>
                                    </div>
                                    <span className="text-lg font-bold text-white">Component Crafter</span>
                                </div>
                                <p className="text-gray-400 mb-6">Build beautiful React components powered by AI.</p>
                                <div className="flex space-x-4">
                                    <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                        <i className="fa-brands fa-twitter text-xl"></i>
                                    </a>
                                    <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                        <i className="fa-brands fa-github text-xl"></i>
                                    </a>
                                    <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                        <i className="fa-brands fa-discord text-xl"></i>
                                    </a>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-4">Product</h3>
                                <ul className="space-y-3">
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Features
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Pricing
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Roadmap
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Beta Program
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-4">Resources</h3>
                                <ul className="space-y-3">
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Documentation
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Tutorials
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Blog
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Community
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-4">Company</h3>
                                <ul className="space-y-3">
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            About
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Careers
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Contact
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                            Legal
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500">
                            <p>© 2023 Component Crafter. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}

export default A;
