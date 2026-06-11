import { withApi } from '../../lib/api'
import { recordBranchSale } from '../../controllers/operations'
export default withApi(['POST'], recordBranchSale)
