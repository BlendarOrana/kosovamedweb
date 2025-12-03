import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react"; // Assuming you use lucide-react like most React/Tailwind apps, otherwise replace with text "< Back"

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen w-full flex justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-hidden p-8 sm:p-12">
        
        {/* Header & Back Link */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-sky-600 hover:text-sky-700 transition-colors font-medium mb-6"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
            Privacy Policy
          </h1>
          <p className="text-slate-500 font-medium">Kosovamed App (Internal Use Only)</p>
          <p className="text-sm text-slate-400 mt-1">Last updated: December 3, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <p>
            This Privacy Policy applies to the Kosovamed mobile application (“App”) and explains how we handle data for users who access the system. The App is strictly for internal use by employees and authorized staff of Kosovamed.
          </p>
          <p>
            By using the App, you confirm that you are an authorized user under an existing employment, contractor, or service agreement.
          </p>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">1. Internal Use Only</h2>
            <p className="mb-2">This App is not a public product and is not intended for consumer use. Access is restricted to individuals:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Who are employees, contractors, or authorized personnel of Kosovamed,</li>
              <li>Who have already signed an employment contract, confidentiality agreement, or similar internal document.</li>
            </ul>
            <p className="mt-2">The App does not offer sign-up or registration to the general public.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">2. Information We Collect</h2>
            <p className="mb-2">We only collect information required to operate internal functions of the company.</p>
            
            <h3 className="font-semibold text-slate-700 mt-3">2.1. User Identification</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Full name</li>
              <li>Company email</li>
              <li>Employee ID or username</li>
            </ul>

            <h3 className="font-semibold text-slate-700 mt-3">2.2. Authentication and Access</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Password or encrypted login credentials</li>
              <li>Access logs (login times, internal usage records)</li>
            </ul>

            <h3 className="font-semibold text-slate-700 mt-3">2.3. Device and Technical Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Basic device information (e.g., operating system, model)</li>
              <li>Error logs for debugging and performance</li>
            </ul>
            <p className="mt-2 italic">We do not collect any information for advertising, marketing, or profiling.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">3. Purpose of Data Use</h2>
            <p className="mb-2">Data is collected solely for internal business purposes, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Providing access to authorized internal tools</li>
              <li>Securely identifying users</li>
              <li>Managing internal operations, schedules, assignments, or HR-related functions</li>
              <li>System maintenance, updates, and technical support</li>
              <li>Verifying internal user activity when required</li>
            </ul>
            <p className="mt-2">We do not sell, rent, or distribute any data to outside parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">4. Legal Basis and Agreements</h2>
            <p className="mb-2">By using this App, you acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You have already signed an employment or contractual agreement with Kosovamed,</li>
              <li>You are aware that internal company regulations apply when using this App,</li>
              <li>Any use of data is related to existing internal company obligations.</li>
            </ul>
            <p className="mt-2">User age is not relevant, since this App is not directed to children and cannot be accessed by anyone without authorization.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">5. Data Sharing</h2>
            <p className="mb-2">We only share internal data when necessary for company operations:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IT staff and system administrators</li>
              <li>Third-party hosting or cloud providers (technical only)</li>
              <li>Legal authorities when required by law</li>
            </ul>
            <p className="mt-2">No personal information is shared externally for commercial purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">6. Data Security</h2>
            <p className="mb-2">We take reasonable measures to protect data, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Password encryption</li>
              <li>Limited access controls</li>
              <li>Server-side security practices</li>
              <li>Monitoring and internal auditing</li>
            </ul>
            <p className="mt-2">While we strive to protect data, no system can be guaranteed completely secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">7. Data Retention</h2>
            <p className="mb-2">Data is retained only as long as necessary for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Internal operations</li>
              <li>Legal obligations</li>
              <li>Employment records and system integrity</li>
            </ul>
            <p className="mt-2">Employees may request data review or removal through internal management channels.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">8. Children’s Privacy</h2>
            <p>
              This App is not open to the public and cannot be used by minors.
              Since all users are already employees or contractors under a signed agreement, age verification is not applicable. The App does not target or knowingly collect data from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">9. Third-Party Services</h2>
            <p className="mb-2">The App may use secure third-party providers for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hosting and server infrastructure</li>
              <li>Cloud data storage</li>
              <li>System logging and performance monitoring</li>
            </ul>
            <p className="mt-2">These providers are contractually obligated to maintain confidentiality and data protection.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">10. Contact Information</h2>
            <p className="mb-2">For questions or requests related to privacy or data usage, contact us at:</p>
            <p className="font-medium text-slate-700">Email: <a href="mailto:support@kosovamed-app.com" className="text-sky-600 hover:underline">support@kosovamed-app.com</a></p>
            <p className="font-medium text-slate-700">Website: <a href="https://kosovamed-app.com/" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">https://kosovamed-app.com/</a></p>
          </section>
        </div>
        
        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-100 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Kosovamed. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;