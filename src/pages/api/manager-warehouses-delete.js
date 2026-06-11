import { withApi } from '../../lib/api'
import { deleteManagedWarehouse } from '../../controllers/operations'

export default withApi(['POST'], deleteManagedWarehouse)
