import { withApi } from '../../lib/api'
import { deleteManagedBranch } from '../../controllers/operations'
export default withApi(['POST'], deleteManagedBranch)
