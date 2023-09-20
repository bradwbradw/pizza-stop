import _ from "lodash";

export default function findReasonString(err) {
  return _.trim(
    _.last(_.split(_.get(err, "details"), "reverted with reason string")),
    " '"
  );
}
