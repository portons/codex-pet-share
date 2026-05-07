import { Icon } from "./Icon";

export function SignInGate({ onSignIn, label }: { onSignIn: () => void; label: string }) {
  return (
    <section className="signInGate card">
      <div className="gateIcon">
        <Icon name="user" size={18} />
      </div>
      <p>{label}</p>
      <button className="btn btnPrimary" type="button" onClick={onSignIn}>
        Sign in
      </button>
    </section>
  );
}
