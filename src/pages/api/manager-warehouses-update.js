import { withApi } from '../../lib/api'
import { updateManagedWarehouse } from '../../controllers/operations'

export default withApi(['POST'], updateManagedWarehouse)
