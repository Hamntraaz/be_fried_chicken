import { withApi } from '../../lib/api'
import { deleteManagedSupplier } from '../../controllers/operations'

export default withApi(['POST'], deleteManagedSupplier)
