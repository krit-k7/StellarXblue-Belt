// =============================================================================
// contractTemplates.js
// Pre-built escrow configurations users can start from.
// Each template maps directly to the Soroban framework's EscrowConfig fields.
// =============================================================================

export const CONTRACT_TEMPLATES = [
  {
    id: 'freelance',
    label: 'Freelance Project',
    icon: '💻',
    desc: 'Standard client-freelancer escrow with review period and dispute option.',
    defaults: {
      contractType: 'freelance',
      reviewPeriod: '7',
      enableArbitrator: true,
      enableMilestones: false,
      autoReleaseOnDeadline: true,
      refundPolicy: 'pre_submit',       // buyer can refund before work submitted
      splitOnDispute: false,
    },
  },
  {
    id: 'milestone',
    label: 'Milestone-Based',
    icon: '🏁',
    desc: 'Break payment into milestones. Each milestone is its own escrow instance.',
    defaults: {
      contractType: 'milestone',
      reviewPeriod: '5',
      enableArbitrator: true,
      enableMilestones: true,
      autoReleaseOnDeadline: true,
      refundPolicy: 'pre_submit',
      splitOnDispute: true,
    },
  },
  {
    id: 'audit',
    label: 'Security Audit',
    icon: '🔍',
    desc: 'Longer review period, mandatory arbitrator, strict refund policy.',
    defaults: {
      contractType: 'audit',
      reviewPeriod: '14',
      enableArbitrator: true,
      enableMilestones: false,
      autoReleaseOnDeadline: false,     // audits need explicit approval
      refundPolicy: 'never',            // no unilateral refund once funded
      splitOnDispute: true,
    },
  },
  {
    id: 'quick',
    label: 'Quick Task',
    icon: '⚡',
    desc: 'Small task, short deadline, no arbitrator needed.',
    defaults: {
      contractType: 'quick',
      reviewPeriod: '3',
      enableArbitrator: false,
      enableMilestones: false,
      autoReleaseOnDeadline: true,
      refundPolicy: 'pre_submit',
      splitOnDispute: false,
    },
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: '⚙️',
    desc: 'Start from scratch and configure every option yourself.',
    defaults: {
      contractType: 'custom',
      reviewPeriod: '7',
      enableArbitrator: false,
      enableMilestones: false,
      autoReleaseOnDeadline: true,
      refundPolicy: 'pre_submit',
      splitOnDispute: false,
    },
  },
]

// Maps a refundPolicy value to a human-readable label
export const REFUND_POLICY_LABELS = {
  pre_submit: 'Before work is submitted (buyer can cancel anytime)',
  never:      'No refund once funded (work must be completed or disputed)',
  deadline:   'Only after deadline passes with no submission',
}

// Maps reviewPeriod to a label
export function reviewPeriodLabel(days) {
  const n = Number(days)
  if (n <= 3)  return 'Short (3 days)'
  if (n <= 7)  return 'Standard (7 days)'
  if (n <= 14) return 'Extended (14 days)'
  return `${n} days`
}
