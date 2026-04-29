import { truncateAddr, formatXLM, formatDate, daysRemaining } from '../utils/contract'

export default function ContractCard({ contract, onClick }) {
  const days = daysRemaining(contract.deadline)
  const isOverdue = days !== null && days < 0

  return (
    <div className="card card-clickable" onClick={() => onClick(contract)}>
      <div className="contract-card-header">
        <div>
          <div className="contract-card-title">{contract.title || 'Untitled Contract'}</div>
          <div className="contract-card-addr">{contract.id}</div>
        </div>
        <span className={`badge badge-${contract.status.toLowerCase()}`}>
          {contract.status}
        </span>
      </div>

      <div className="escrow-visual" style={{ padding: '16px', marginBottom: 0 }}>
        <div className="contract-card-amount">
          {formatXLM(contract.amount)} <span>in escrow</span>
        </div>
      </div>

      <div className="contract-card-meta">
        <div className="contract-card-meta-item">
          <strong>Freelancer</strong>
          {truncateAddr(contract.freelancer)}
        </div>
        <div className="contract-card-meta-item">
          <strong>Deadline</strong>
          {formatDate(contract.deadline)}
        </div>
        <div className="contract-card-meta-item">
          <strong>{isOverdue ? 'Overdue' : 'Remaining'}</strong>
          <span style={{ color: isOverdue ? 'var(--red)' : days <= 3 ? 'var(--yellow)' : 'var(--text)' }}>
            {days === null ? '—' : isOverdue ? `${Math.abs(days)}d ago` : `${days}d`}
          </span>
        </div>
      </div>
    </div>
  )
}
