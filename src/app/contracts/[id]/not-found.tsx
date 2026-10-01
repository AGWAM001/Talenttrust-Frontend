import Link from 'next/link';

export default function ContractNotFound() {
  return (
    <div role="alert" className="contract-not-found">
      <h2>Contract not found</h2>
      <p>
        We could not find a contract with the requested identifier. It may have
        been removed or the link may be invalid.
      </p>
      <Link href="/contracts">Back to contracts</Link>
    </div>
  );
}
