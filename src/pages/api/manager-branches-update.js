import { withApi } from '../../lib/api'
import { updateManagedBranch } from '../../controllers/operations'
export default withApi(['POST'], updateManagedBranch)
