import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auth, signInWithPopup, googleProvider } from "../firebase";
import { Shield, Lock, Eye, Zap, CheckCircle, ArrowRight, Users } from "lucide-react";
// import { doc, setDoc, serverTimestamp } from "firebase/firestore"; // Temporarily disabled

const SignIn = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse position for 3D effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Signed in user:", result.user.uid);
      
      // Navigate to dashboard immediately - no Firestore dependency
      navigate("/Dashboard");
    } catch (err) {
      console.error("Google Sign-In Error:", err.code, err.message);
      let errorMessage = "An unknown sign-in error occurred.";
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed. Please try again.";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in request was cancelled. Try again.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white overflow-hidden">
      {/* Animated gradient orbs - Enhanced */}
      <motion.div
        className="absolute w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[200px] top-0 left-0"
        animate={{ 
          x: [0, 150, -100, 0], 
          y: [0, 100, -150, 0],
          scale: [1, 1.2, 0.8, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[180px] bottom-0 right-0"
        animate={{ 
          x: [100, -150, 50, 100], 
          y: [100, -50, -100, 100],
          scale: [1, 0.9, 1.1, 1]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        
        {/* Left Side - Hero Section */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-20 py-12 lg:py-0">
          
          {/* Logo */}
          <motion.div 
            className="flex items-center space-x-2 sm:space-x-3 mb-8 sm:mb-12"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-500/40">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 tracking-tight premium-heading">
                HALTT
              </h1>
              <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-widest font-medium -mt-1">Security Platform</p>
            </div>
          </motion.div>

          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl premium-heading text-white mb-4 sm:mb-6 leading-tight">
              Secure Your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Crypto Assets
              </span>
            </h2>
            <p className="premium-body text-gray-400 text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-xl leading-relaxed">
              Real-time monitoring, fraud detection, and advanced security for your Solana wallets. 
              Protect what matters most.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mb-8 sm:mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            {[
              { icon: Shield, text: "Multi-wallet Protection" },
              { icon: Eye, text: "Real-time Monitoring" },
              { icon: Lock, text: "Fraud Detection" },
              { icon: Zap, text: "Instant Alerts" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-center space-x-3 p-3 sm:p-4 rounded-xl bg-gray-900/50 border border-gray-800/50 backdrop-blur-sm hover:border-cyan-500/30 transition-all group"
                whileHover={{ scale: 1.02, x: 5 }}
                style={{
                  transform: window.innerWidth > 768 ? `perspective(1000px) rotateY(${mousePosition.x * 0.02}deg) rotateX(${-mousePosition.y * 0.02}deg)` : 'none'
                }}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-all flex-shrink-0">
                  <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                </div>
                <span className="premium-body text-gray-300 text-xs sm:text-sm">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="flex flex-wrap gap-6 sm:gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "Monitoring" },
              { value: "<1s", label: "Response Time" }
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-2xl sm:text-3xl premium-heading text-cyan-400">{stat.value}</div>
                <div className="premium-label text-gray-500 text-[10px] sm:text-xs">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Side - Sign In Card */}
        <div className="flex items-center justify-center px-6 sm:px-8 md:px-12 lg:px-20 lg:w-[600px] py-12 lg:py-0">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ delay: 0.3, duration: 1, type: "spring" }}
            style={{
              transform: window.innerWidth > 1024 ? `perspective(1000px) rotateY(${mousePosition.x * 0.5}deg) rotateX(${-mousePosition.y * 0.5}deg)` : 'none'
            }}
          >
            <div className="bg-gray-900/60 backdrop-blur-2xl border border-gray-800/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-cyan-500/10">
              
              {/* Card Header */}
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-2xl sm:text-3xl premium-heading text-white mb-2 sm:mb-3">Welcome Back</h3>
                <p className="premium-body text-gray-400 text-sm sm:text-base">Sign in to access your dashboard</p>
              </div>

              {/* Sign In Button */}
              <motion.button
                onClick={handleGoogleSignIn}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3 sm:py-4 rounded-xl premium-subheading text-sm sm:text-base transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3 ${
                  loading
                    ? "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Google</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              {/* Error Message */}
              {error && (
                <motion.div
                  className="mt-6 p-4 bg-red-900/30 border border-red-600/50 text-red-300 rounded-xl text-sm premium-body"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {error}
                </motion.div>
              )}

              {/* Security Badge */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-800/50">
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                  <span className="premium-body text-[10px] sm:text-xs text-center">Secured with enterprise-grade encryption</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Second Section - Problem & Solution */}
      <div className="relative z-10 bg-gradient-to-b from-transparent via-gray-950/50 to-gray-950 py-12 sm:py-16 md:py-20 lg:py-24 px-6 sm:px-8 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          
          {/* Problem Statement */}
          <motion.div
            className="mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="w-1 h-8 sm:h-10 md:h-12 bg-gradient-to-b from-red-500 to-orange-500 rounded-full" />
              <h3 className="text-2xl sm:text-3xl md:text-4xl premium-heading text-white">The Reality of Crypto Security</h3>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
              {[
                { 
                  value: "$2.3B", 
                  label: "Lost to crypto scams in 2023",
                  color: "from-red-500 to-orange-500"
                },
                { 
                  value: "67%", 
                  label: "Of users encountered phishing attempts",
                  color: "from-orange-500 to-yellow-500"
                },
                { 
                  value: "$4,300", 
                  label: "Average loss per victim",
                  color: "from-yellow-500 to-red-500"
                }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="relative group"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: window.innerWidth > 768 ? 1.05 : 1 }}
                  style={{
                    transform: window.innerWidth > 768 ? `perspective(1000px) rotateY(${mousePosition.x * 0.02}deg) rotateX(${-mousePosition.y * 0.02}deg)` : 'none'
                  }}
                >
                  <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-800/50 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:border-red-500/30 transition-all">
                    <div className={`text-3xl sm:text-4xl md:text-5xl premium-heading mb-2 sm:mb-3 text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                      {stat.value}
                    </div>
                    <p className="premium-body text-gray-400 text-xs sm:text-sm leading-relaxed">{stat.label}</p>
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-opacity`} />
                </motion.div>
              ))}
            </div>

            <motion.p
              className="premium-body text-gray-300 text-sm sm:text-base md:text-lg mt-6 sm:mt-8 md:mt-10 max-w-4xl leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Current wallet solutions are <span className="text-red-400 font-semibold">reactive</span> — users discover fraud after it's too late. 
              Fragmented security across multiple wallets leaves users vulnerable, with no centralized protection or real-time threat detection.
            </motion.p>
          </motion.div>

          {/* Solution Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="w-1 h-8 sm:h-10 md:h-12 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full" />
              <h3 className="text-2xl sm:text-3xl md:text-4xl premium-heading text-white">Proactive Protection, Not Reactive Recovery</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mt-6 sm:mt-8 md:mt-10">
              {[
                {
                  icon: Shield,
                  title: "Pre-Transaction Validation",
                  description: "Every transaction is screened in real-time before funds leave your wallet. Suspicious addresses are blocked instantly, not after the damage is done.",
                  gradient: "from-cyan-500 to-blue-500"
                },
                {
                  icon: Users,
                  title: "Community Shield Intelligence",
                  description: "Harness collective security through decentralized threat intelligence. Every user report strengthens the network, creating a living defense system that adapts faster than any single provider.",
                  gradient: "from-blue-500 to-purple-500",
                  badge: "Unique to HALTT"
                },
                {
                  icon: Eye,
                  title: "Unified Multi-Wallet Dashboard",
                  description: "Manage Phantom, Solflare, Backpack, and MetaMask from one secure interface. Consolidated transaction history, real-time balances, and centralized security across all your wallets.",
                  gradient: "from-purple-500 to-pink-500"
                },
                {
                  icon: Lock,
                  title: "Zero Private Key Exposure",
                  description: "Read-only wallet access means your private keys never leave your wallet. Complete security without compromise, with enterprise-grade encryption protecting your data.",
                  gradient: "from-pink-500 to-red-500"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="relative group"
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  whileHover={{ y: window.innerWidth > 768 ? -5 : 0 }}
                  style={{
                    transform: window.innerWidth > 768 ? `perspective(1000px) rotateY(${mousePosition.x * 0.03}deg) rotateX(${-mousePosition.y * 0.03}deg)` : 'none'
                  }}
                >
                  <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-800/50 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 h-full hover:border-cyan-500/30 transition-all">
                    {feature.badge && (
                      <div className="inline-block px-2 sm:px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full mb-3 sm:mb-4">
                        <span className="premium-label text-cyan-400 text-[9px] sm:text-[10px]">{feature.badge}</span>
                      </div>
                    )}
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-10 flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <h4 className="text-lg sm:text-xl premium-subheading text-white mb-2 sm:mb-3">{feature.title}</h4>
                    <p className="premium-body text-gray-400 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl blur-2xl transition-opacity`} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Network Effect Callout */}
          <motion.div
            className="mt-20 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
              
              <div className="relative z-10 text-center max-w-3xl mx-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center"
                >
                  <Zap className="w-8 h-8 text-white" />
                </motion.div>
                <h4 className="text-3xl premium-heading text-white mb-4">
                  The More Users, The Safer Everyone Becomes
                </h4>
                <p className="premium-body text-gray-300 text-lg leading-relaxed">
                  HALTT creates a <span className="text-cyan-400 font-semibold">network effect</span> — every user report, every flagged address, 
                  every transaction validation makes the platform exponentially more effective. You're not just protecting yourself, 
                  you're <span className="text-cyan-400 font-semibold">protecting the entire community</span>.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default SignIn;
