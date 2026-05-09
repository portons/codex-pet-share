import { APP_NAME, APP_REPO_URL } from "../branding/brand";

export function LegalPage({ page }: { page: "privacy" | "terms" }) {
  const isPrivacy = page === "privacy";
  return (
    <section className="legalPage">
      <header className="sectionHeader">
        <div>
          <p className="metaText">{APP_NAME}</p>
          <h1>{isPrivacy ? "Privacy Policy" : "Terms of Service"}</h1>
          <p className="sectionSubhead">Effective May 9, 2026</p>
        </div>
      </header>

      {isPrivacy ? <PrivacyPolicy /> : <TermsOfService />}
    </section>
  );
}

function PrivacyPolicy() {
  return (
    <div className="legalCopy">
      <section>
        <h2>Data We Use</h2>
        <p>
          {APP_NAME} stores account email addresses, display names, upload metadata, pet assets, likes, collections,
          playground room state, and moderation records needed to operate the app.
        </p>
      </section>
      <section>
        <h2>Authentication</h2>
        <p>
          Email accounts use verification and password reset emails. Google and X sign-in store the provider user id,
          verified email address, display name, and profile image URL returned by the provider so accounts can be created
          or linked without duplicating users.
        </p>
      </section>
      <section>
        <h2>Service Providers</h2>
        <p>
          The app runs on Cloudflare for hosting, storage, database, and realtime infrastructure. Auth emails are sent
          through Resend. Google and X process their own sign-in flows when selected by the user.
        </p>
      </section>
      <section>
        <h2>Public Content</h2>
        <p>
          Uploaded pets, creator names, tags, collections, previews, and share pages are public. Do not upload content or
          account names that you want to keep private.
        </p>
      </section>
      <section>
        <h2>Requests</h2>
        <p>
          Account, privacy, moderation, and takedown requests can be filed through the project{" "}
          <a href={APP_REPO_URL} target="_blank" rel="noopener noreferrer">issue tracker</a>.
        </p>
      </section>
    </div>
  );
}

function TermsOfService() {
  return (
    <div className="legalCopy">
      <section>
        <h2>Use of the App</h2>
        <p>
          {APP_NAME} is a community app for uploading, browsing, downloading, sharing, and playing with pixel pet assets.
          You are responsible for the content you upload and the account activity performed from your session.
        </p>
      </section>
      <section>
        <h2>Uploaded Content</h2>
        <p>
          By uploading content, you confirm you have the rights or permission needed to share it publicly through the app.
          Public pet assets may be displayed in galleries, previews, social cards, downloads, and playground rooms.
        </p>
      </section>
      <section>
        <h2>Moderation</h2>
        <p>
          Administrators may edit tags, manage collections, mark content as NSFW, shadowban owners, or remove users and
          uploads when needed to operate the app or respond to reports.
        </p>
      </section>
      <section>
        <h2>Third-Party Services</h2>
        <p>
          Google and X sign-in are optional authentication methods. Use of those services is also governed by their own
          terms and policies.
        </p>
      </section>
      <section>
        <h2>Reports</h2>
        <p>
          Takedown requests, account issues, and other reports can be filed through the project{" "}
          <a href={APP_REPO_URL} target="_blank" rel="noopener noreferrer">issue tracker</a>.
        </p>
      </section>
    </div>
  );
}
