import { withApi } from '../../lib/api'
import { updateBranchRequest } from '../../controllers/operations'
export default withApi(['POST'], updateBranchRequest)
