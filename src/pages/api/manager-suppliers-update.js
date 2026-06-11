import { withApi } from '../../lib/api'
import { updateManagedSupplier } from '../../controllers/operations'

export default withApi(['POST'], updateManagedSupplier)
