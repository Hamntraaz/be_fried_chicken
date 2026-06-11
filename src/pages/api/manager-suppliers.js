import { withApi } from '../../lib/api'
import { createManagedSupplier } from '../../controllers/operations'

export default withApi(['POST'], createManagedSupplier)
