import { withApi } from '../../lib/api'
import { createBranchRequest } from '../../controllers/operations'
export default withApi(['POST'], createBranchRequest)
