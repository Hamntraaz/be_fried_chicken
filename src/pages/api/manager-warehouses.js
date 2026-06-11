import { withApi } from '../../lib/api'
import { createManagedWarehouse } from '../../controllers/operations'

export default withApi(['POST'], createManagedWarehouse)
