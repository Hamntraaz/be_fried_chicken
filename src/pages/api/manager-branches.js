import { withApi } from '../../lib/api'
import { createManagedBranch } from '../../controllers/operations'
export default withApi(['POST'], createManagedBranch)
