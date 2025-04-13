import React, { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ClipboardDocumentIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
  LightBulbIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { twMerge } from 'tailwind-merge';

interface AnalysisResult {
  score: number;
  analysis: {
    sections: Array<{ name: string; present: boolean }>;
    jobMatch: {
      percentage: number;
      matchedSkills: number;
      totalSkills: number;
    };
  };
  missingSkills: string[];
  strengths: string[];
  suggestions: string[];
  formatIssues: string[];
}

const API_URL = 'https://server-git-main-vivek-agrawal-projects.vercel.app';

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10">
    {/* Gradient Orbs */}
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    
    {/* Grid Pattern */}
    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:50px_50px]"></div>
  </div>
);

const App: React.FC = () => {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sections: { name: string; present: boolean }[] = [
    { name: "Contact Information", present: true },
    { name: "Professional Summary", present: true },
    { name: "Work Experience", present: true },
    { name: "Education", present: true },
    { name: "Skills", present: true },
    { name: "Projects", present: false },
    { name: "Certifications", present: false },
    { name: "Awards", present: false }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // TODO: Extract text from PDF/DOCX
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    
    // Input validation
    if (!file && !resumeText.trim()) {
      setError("Please upload a resume file or paste resume text");
      setLoading(false);
      return;
    }
    
    if (!jobDescription.trim()) {
      setError("Please provide a job description");
      setLoading(false);
      return;
    }

    try {
      // Log the request details
      const requestUrl = `${API_URL}/api/resume/analyze`;
      console.log('Request URL:', requestUrl);
      console.log('Request method: POST');
      
      let res;
      
      if (file) {
        // Handle file upload with multipart/form-data
        const formData = new FormData();
        formData.append('resumeFile', file);
        formData.append('jobDescription', jobDescription.trim());
        
        // Log form data entries
        for (const [key, value] of formData.entries()) {
          console.log(`${key}:`, value);
        }
        
        res = await fetch(requestUrl, {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
      } else {
        // Handle text input with application/json
        const requestBody = {
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim()
        };
        
        console.log('Request body:', requestBody);
        
        res = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(requestBody)
        });
      }
      
      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));
      
      const responseText = await res.text();
      console.log('Raw response:', responseText);
      
      // Check if the response is HTML (error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.includes('<html')) {
        console.error('Received HTML error page instead of JSON response');
        throw new Error('Server returned an error page. Please try again later.');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        console.error('Response content:', responseText);
        throw new Error('Invalid response format from server. Please try again later.');
      }
      
      if (!res.ok) {
        console.error('Error response data:', data);
        if (res.status === 500) {
          console.error('Server error details:', {
            status: res.status,
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries()),
            body: data,
            requestUrl,
            requestMethod: 'POST'
          });
          
          // Check for specific error messages
          if (data.error === 'Something broke!') {
            throw new Error('The server encountered an unexpected error. Please try again in a few minutes or contact support if the issue persists.');
          }
          
          throw new Error('Server encountered an error. Please try again later or contact support if the issue persists.');
        }
        throw new Error(data.error || data.details || `Error: ${res.status} ${res.statusText}`);
      }
      
      // Update the analysis state with the server's response format
      setAnalysis({
        score: data.overallScore,
        analysis: {
          sections: [
            { name: "Contact Information", present: data.contentAnalysis.hasContactInfo },
            { name: "Education", present: data.contentAnalysis.hasEducation },
            { name: "Experience", present: data.contentAnalysis.hasExperience },
            { name: "Skills", present: data.contentAnalysis.hasSkills },
            { name: "Summary", present: data.contentAnalysis.hasSummary }
          ],
          jobMatch: {
            percentage: data.skillAnalysis.score,
            matchedSkills: data.skillAnalysis.matchingSkills.length,
            totalSkills: data.skillAnalysis.matchingSkills.length + data.skillAnalysis.missingSkills.length
          }
        },
        missingSkills: data.skillAnalysis.missingSkills,
        strengths: data.chatGPTFeedback.strengths,
        suggestions: data.chatGPTFeedback.suggestions,
        formatIssues: data.contentAnalysis.suggestions
      });
    } catch (error) {
      console.error("Analysis error:", error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError("Could not connect to the server. Please check your internet connection and try again.");
      } else if (error instanceof SyntaxError) {
        setError("Invalid response from server. Please try again later.");
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred while analyzing the resume");
      }
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!analysis) return;
    
    const content = `
Resume Analysis Report
=====================

Score: ${analysis.score.toFixed(2)}/100

Missing Skills:
${analysis.missingSkills.map(skill => `- ${skill}`).join('\n')}

Format Issues:
${analysis.formatIssues.map(issue => `- ${issue}`).join('\n')}

Strengths:
${analysis.strengths.map(strength => `- ${strength}`).join('\n')}

Suggestions for Improvement:
${analysis.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-analysis-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative">
      <AnimatedBackground />
      
      <div className="min-h-screen w-full flex flex-col relative">
        {/* Header */}
        <header className="w-full py-6 sm:py-8 bg-gray-900/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
          <div className="w-full px-6 sm:px-8 lg:px-10">
            <div className="flex items-center justify-center">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
                <div className="relative flex items-center space-x-6 bg-gray-900 px-8 py-4 rounded-lg">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    Resume Analyzer
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full min-h-[calc(100vh-5rem)] overflow-y-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 relative">
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full mb-6"
              >
                <div className="bg-red-900/50 border-l-4 border-red-500 p-4 rounded-r-lg backdrop-blur-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Section */}
          <div className="w-full h-full space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 h-full">
              {/* Resume Upload Card */}
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10"
              >
                <div className="p-6 sm:p-8 h-full flex flex-col">
                  <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6 flex items-center">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Resume Upload
                  </h2>
                  <div className="flex-1 space-y-6">
                    {/* File Upload Area */}
                    <div className="group h-1/3">
                      <label className="block w-full h-full cursor-pointer border-2 border-dashed border-blue-400/30 rounded-xl bg-gray-700/30 hover:bg-gray-700/50 transition-colors duration-200">
                        <div className="h-full flex flex-col items-center justify-center p-6">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <ArrowUpTrayIcon className={twMerge(
                              "w-8 h-8 sm:w-10 sm:h-10",
                              file ? "text-green-500" : "text-gray-400"
                            )} />
                          </div>
                          <p className="text-base sm:text-lg text-blue-200 text-center font-medium">
                            {file ? file.name : "Drop your resume here or click to browse"}
                          </p>
                          <p className="mt-2 text-sm text-blue-300/60">Supported formats: PDF, DOCX</p>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".pdf,.docx"
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Text Input Area */}
                    <div className="h-2/3">
                      <h3 className="text-base sm:text-lg font-medium text-white mb-4">Or Paste Resume Text</h3>
      <Textarea
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your resume content here..."
                        className="w-full h-full min-h-[200px] resize-none bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Job Description Card */}
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10"
              >
                <div className="p-6 sm:p-8 h-full flex flex-col">
                  <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6 flex items-center">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 mr-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Job Description
                  </h2>
      <Textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste the job description here..."
                    className="w-full h-full min-h-[400px] resize-none bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full sm:w-auto min-w-[200px] h-12 sm:h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 hover:scale-105"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  "Analyze Resume"
                )}
              </Button>
              {analysis && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="w-full sm:w-auto min-w-[200px] h-12 sm:h-14 border-2 border-blue-400 text-blue-400 rounded-xl font-semibold hover:bg-blue-400/10 transition-all duration-200 shadow-lg shadow-blue-600/10 hover:scale-105"
                >
                  Download Report
      </Button>
              )}
            </div>
          </div>

          {/* Analysis Results */}
          <AnimatePresence>
      {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                className="w-full mt-12 space-y-8"
              >
                {/* Score Overview */}
                <div className="w-full relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-blue-600 to-purple-600">
                  <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]"></div>
                  <div className="relative p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      {/* Main Score */}
                      <div className="text-center md:text-left">
                        <div className="inline-flex items-baseline">
                          <span className="text-5xl sm:text-6xl font-bold text-white">
                            {analysis.score.toFixed(2)}
                          </span>
                          <span className="text-xl sm:text-2xl text-blue-200">/100</span>
                        </div>
                        <p className="mt-2 text-lg sm:text-xl text-blue-100">Overall Score</p>
                      </div>

                      {/* Stats */}
                      <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="bg-white/10 backdrop-blur rounded-xl p-4 sm:p-6"
                        >
                          <p className="text-3xl sm:text-4xl font-bold text-white mb-2">
                            {analysis.analysis.jobMatch.percentage.toFixed(2)}%
                          </p>
                          <p className="text-base sm:text-lg text-blue-100">Job Match</p>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="bg-white/10 backdrop-blur rounded-xl p-4 sm:p-6"
                        >
                          <p className="text-3xl sm:text-4xl font-bold text-white mb-2">
                            {analysis.analysis.jobMatch.matchedSkills}/{analysis.analysis.jobMatch.totalSkills}
                          </p>
                          <p className="text-base sm:text-lg text-blue-100">Skills Match</p>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Resume Sections */}
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/10"
                  >
                    <h3 className="flex items-center text-lg sm:text-xl font-semibold text-white mb-4">
                      <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mr-3" />
                      Resume Sections
                    </h3>
                    <div className="space-y-3">
                      {sections.map((section) => (
                        <motion.div
                          key={section.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: sections.indexOf(section) * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-700/50"
                        >
                          <span className="capitalize font-medium text-gray-100">
                            {section.name}
                          </span>
                          {section.present ? (
                            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                              Present
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-medium">
                              Missing
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Key Findings */}
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/10"
                  >
                    <h3 className="flex items-center text-lg sm:text-xl font-semibold text-white mb-4">
                      <LightBulbIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mr-3" />
                      Key Findings
                    </h3>
                    <div className="space-y-3">
                      {analysis.strengths.map((strength, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start space-x-3 p-3 rounded-xl bg-green-500/10"
                        >
                          <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <p className="text-green-100">{strength}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Skills Gap */}
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/10"
                  >
                    <h3 className="flex items-center text-lg sm:text-xl font-semibold text-white mb-4">
                      <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mr-3" />
                      Skills Gap
                    </h3>
                    <div className="space-y-3">
                      {analysis.missingSkills.map((skillSet, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-3 rounded-xl bg-blue-500/10"
                        >
                          <p className="text-blue-100">{skillSet}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Recommendations */}
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/10"
                  >
                    <h3 className="flex items-center text-lg sm:text-xl font-semibold text-white mb-4">
                      <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mr-3" />
                      Recommendations
                    </h3>
                    <div className="space-y-3">
                      {analysis.suggestions.map((suggestion, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start space-x-3 p-3 rounded-xl bg-purple-500/10"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                          <p className="text-purple-100">{suggestion}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Format Issues */}
                {analysis.formatIssues.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="w-full bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/10"
                  >
                    <h3 className="flex items-center text-lg sm:text-xl font-semibold text-white mb-4">
                      <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mr-3" />
                      Format Issues
                    </h3>
                    <div className="space-y-3">
                      {analysis.formatIssues.map((issue, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-3 p-3 rounded-xl bg-yellow-500/10"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
                          <p className="text-yellow-100">{issue}</p>
                        </motion.div>
                      ))}
        </div>
                  </motion.div>
                )}
              </motion.div>
      )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default App;
